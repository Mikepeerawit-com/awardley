import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { signIn } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service-client";
import {
  memoryCookieStore,
  type SessionCookieStore,
} from "@/lib/supabase/session-client";

import type { StripeBoundary } from "./stripe";
import { lapseExpiredTrials, startTrial } from "./trial";

/**
 * The card-less trial, both ends of it: the button that starts one and the cron that
 * ends one.
 *
 * Against the real local Postgres, because every claim here is about what a row holds
 * afterwards and about which rows a single `update` reaches. The second is the half that
 * cannot be checked any other way — `lapseExpiredTrials` is one statement with three
 * conditions on it, and the only way to know that the condition about subscriptions is
 * really there is to stage a paying organisation carrying an expired trial date beside an
 * unpaid one and watch which of them moves.
 *
 * `runDailyCron` has no test file of its own, so the cron's half of #180 is proven here,
 * at the function the cron calls.
 */

const password = "correct-horse-battery-staple";
const run = crypto.randomUUID().slice(0, 8);

const service = createServiceClient();

/** The organisation the button is pressed in. */
let orgId = "";

const admin = { id: "", email: `trial-admin-${run}@example.test` };
const member = { id: "", email: `trial-member-${run}@example.test` };

/** The run instant every case below is pinned to (ADR-0010). */
const at = new Date("2026-09-23T04:00:00Z");

/** A Price offering `days` of trial, or none at all. Nothing else is reachable. */
function boundaryOffering(days: number | null): StripeBoundary {
  return {
    retrieveTrialDays: async () => days,
    retrieveSubscription: () => unreachable(),
    createCustomer: () => unreachable(),
    createCheckoutSession: () => unreachable(),
    createPortalSession: () => unreachable(),
  };
}

function unreachable(): never {
  throw new Error("starting a trial must not reach this call");
}

async function signedInAs(email: string): Promise<SessionCookieStore> {
  const store = memoryCookieStore();
  const result = await signIn({ email, password }, store);

  if (!result.ok) throw new Error(`could not sign in as ${email}`);

  return store;
}

async function createPerson(
  who: { id: string; email: string },
  fields: { name: string; isOrgAdmin: boolean },
): Promise<void> {
  const { data, error } = await service.auth.admin.createUser({
    email: who.email,
    password,
    email_confirm: true,
  });

  if (error) throw error;

  who.id = data.user.id;

  const { error: profileError } = await service.from("users").insert({
    id: who.id,
    active_org_id: orgId,
    name: fields.name,
    email: who.email,
  });

  if (profileError) throw profileError;

  const { error: membershipError } = await service.from("memberships").insert({
    user_id: who.id,
    org_id: orgId,
    is_org_admin: fields.isOrgAdmin,
  });

  if (membershipError) throw membershipError;
}

type Billing = {
  plan_id: string;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
};

async function readBilling(id: string): Promise<Billing> {
  const { data, error } = await service
    .from("orgs")
    .select("plan_id, trial_ends_at, stripe_subscription_id")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as Billing;
}

async function setBilling(id: string, fields: Partial<Billing>): Promise<void> {
  const { error } = await service.from("orgs").update(fields).eq("id", id);

  if (error) throw error;
}

beforeAll(async () => {
  const { data, error } = await service
    .from("orgs")
    .insert({ name: `Trial ${run}` })
    .select("id")
    .single();

  if (error) throw error;

  orgId = data.id;

  await createPerson(admin, { name: "Trial admin", isOrgAdmin: true });
  await createPerson(member, { name: "Trial member", isOrgAdmin: false });
});

afterAll(async () => {
  const ids = [admin.id, member.id].filter(Boolean);

  await service.from("users").delete().in("id", ids);

  for (const id of ids) await service.auth.admin.deleteUser(id);

  await service.from("orgs").delete().eq("id", orgId);

  vi.unstubAllEnvs();
});

beforeEach(async () => {
  // Read per call by `requiredEnv`, which is what makes it pinnable here at all.
  vi.stubEnv("STRIPE_PRICE_ID", `price_${run}`);

  await setBilling(orgId, {
    plan_id: "free",
    trial_ends_at: null,
    stripe_subscription_id: null,
  });
});

describe("startTrial", () => {
  it("moves the organisation onto the paid plan for as many days as the Price offers", async () => {
    const result = await startTrial(at, await signedInAs(admin.email), boundaryOffering(14));

    expect(result).toEqual({ ok: true, endsAt: new Date("2026-10-07T04:00:00Z") });

    const row = await readBilling(orgId);

    expect(row.plan_id).toBe("paid");
    expect(row.trial_ends_at).not.toBeNull();
    // No subscription, and that absence is the definition of this trial rather than an
    // omission: nothing was created in Stripe, so nothing has to be cancelled when it
    // ends, and no card was asked for to begin it.
    expect(row.stripe_subscription_id).toBeNull();
  });

  it("counts the days from the instant the request resolved, not from the clock", async () => {
    // ADR-0010, and the reason the end is computed from an argument. A trial that started
    // whenever the process happened to look at its own clock would end on a different day
    // depending on which region answered.
    const result = await startTrial(at, await signedInAs(admin.email), boundaryOffering(7));

    expect(result).toEqual({ ok: true, endsAt: new Date("2026-09-30T04:00:00Z") });
  });

  it("refuses somebody who is not an Org Admin, and changes nothing", async () => {
    // The gate is here and not in the page, because a server action is a public endpoint
    // any signed-in member can POST to — and this one moves the whole organisation.
    const result = await startTrial(
      at,
      await signedInAs(member.email),
      boundaryOffering(14),
    );

    expect(result).toEqual({ ok: false, reason: "not_admin" });
    expect((await readBilling(orgId)).plan_id).toBe("free");
  });

  it("refuses an organisation that has already had its trial", async () => {
    // The date is what remembers, and it is kept after the trial lapses for exactly this
    // reason. Cleared on lapse, this refusal would never fire and the offer would renew
    // itself every time it ran out.
    await setBilling(orgId, { plan_id: "free", trial_ends_at: "2026-01-01T00:00:00+00:00" });

    const result = await startTrial(at, await signedInAs(admin.email), boundaryOffering(14));

    expect(result).toEqual({ ok: false, reason: "trial_used" });
  });

  it("tells a paying customer they are past needing one", async () => {
    // A converted trial has a null `trial_ends_at` — the webhook clears it — so without
    // this check first, a paying customer pressing the button would be told they had used
    // something up, and then handed a trial.
    await setBilling(orgId, { stripe_subscription_id: `sub_${run}` });

    const result = await startTrial(at, await signedInAs(admin.email), boundaryOffering(14));

    expect(result).toEqual({ ok: false, reason: "already_paying" });
    expect((await readBilling(orgId)).trial_ends_at).toBeNull();
  });

  it("refuses when the Price offers no trial", async () => {
    // How the business turns the offer off: a change to the Price in Stripe, with no
    // deploy here. Refused rather than defaulted to a length this file invented.
    const result = await startTrial(
      at,
      await signedInAs(admin.email),
      boundaryOffering(null),
    );

    expect(result).toEqual({ ok: false, reason: "no_trial" });
    expect((await readBilling(orgId)).plan_id).toBe("free");
  });

  it("refuses a Price offering zero days rather than expiring one the moment it starts", async () => {
    const result = await startTrial(at, await signedInAs(admin.email), boundaryOffering(0));

    expect(result).toEqual({ ok: false, reason: "no_trial" });
  });
});

/**
 * The end of a trial, which is a cron job and not a Stripe timer — there is no
 * subscription for Stripe to have an opinion about.
 *
 * Staged as four organisations in the four states one `update` has to tell apart. The
 * count is asserted as a floor rather than an exact figure on purpose: the statement is
 * deliberately org-wide, so a suite running beside this one that happens to hold an
 * expired trial is counted too, and pinning the number would be pinning the parallelism.
 * What is asserted exactly is the thing that matters — which of these four rows moved.
 */
describe("lapseExpiredTrials", () => {
  const expired = { id: "" };
  const future = { id: "" };
  const converted = { id: "" };
  const alreadyFree = { id: "" };

  beforeAll(async () => {
    const { data, error } = await service
      .from("orgs")
      .insert([
        {
          name: `Lapse expired ${run}`,
          plan_id: "paid",
          trial_ends_at: "2026-09-22T04:00:00+00:00",
        },
        {
          name: `Lapse future ${run}`,
          plan_id: "paid",
          trial_ends_at: "2026-09-24T04:00:00+00:00",
        },
        {
          name: `Lapse converted ${run}`,
          plan_id: "paid",
          trial_ends_at: "2026-09-22T04:00:00+00:00",
          stripe_subscription_id: `sub_converted_${run}`,
        },
        {
          name: `Lapse free ${run}`,
          plan_id: "free",
          trial_ends_at: "2026-09-22T04:00:00+00:00",
        },
      ])
      .select("id, name");

    if (error) throw error;

    const find = (part: string) => data.find((row) => row.name.includes(part))!.id;

    expired.id = find("expired");
    future.id = find("future");
    converted.id = find("converted");
    alreadyFree.id = find("free");
  });

  afterAll(async () => {
    await service
      .from("orgs")
      .delete()
      .in("id", [expired.id, future.id, converted.id, alreadyFree.id]);
  });

  it("lapses the trial that has passed and leaves the three that have not", async () => {
    const result = await lapseExpiredTrials(at);

    expect(result.lapsed).not.toBeNull();
    expect(result.lapsed).toBeGreaterThanOrEqual(1);

    expect((await readBilling(expired.id)).plan_id).toBe("free");

    // Still running, and the comparison is against the run instant rather than the
    // clock — a run pinned to a moment lapses exactly what that moment had passed.
    expect((await readBilling(future.id)).plan_id).toBe("paid");

    // **The condition that matters.** A converted organisation carries its old trial date
    // until the webhook clears it, so without `stripe_subscription_id is null` this cron
    // would drop a paying customer to the free plan on the morning their trial date went
    // by — a bug no screen shows and no invoice contradicts.
    expect((await readBilling(converted.id)).plan_id).toBe("paid");

    // Already lapsed on an earlier run, and not counted again: the `plan_id = 'paid'`
    // condition is what makes the count "how many lapsed today".
    expect((await readBilling(alreadyFree.id)).plan_id).toBe("free");
  });

  it("keeps the date it lapsed, so the trial stays used", async () => {
    await lapseExpiredTrials(at);

    // Clearing it here would hand the organisation a second trial on the day the first
    // one ended, and would do it silently.
    expect((await readBilling(expired.id)).trial_ends_at).not.toBeNull();
  });

  it("does nothing a second time, because there is nothing left in that state", async () => {
    await lapseExpiredTrials(at);

    // Not an assertion about the number — other suites share this database — but about
    // the row: a lapse is not a thing that can happen to the same organisation twice.
    expect((await readBilling(expired.id)).plan_id).toBe("free");
  });
});
