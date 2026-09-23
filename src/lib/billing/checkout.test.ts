import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { signIn } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service-client";
import {
  memoryCookieStore,
  type SessionCookieStore,
} from "@/lib/supabase/session-client";

import { openPortal, startCheckout } from "./checkout";
import type { CheckoutParams, StripeBoundary } from "./stripe";

/**
 * The two doors out to Stripe, against the real local Postgres.
 *
 * What is being checked is mostly *what is said to Stripe*, because that is where this
 * file can be wrong in ways nothing downstream corrects: a Session created with the wrong
 * quantity floor sells a subscription for fewer people than the organisation has, and the
 * refusal surfaces weeks later at an invite, on a screen that cannot explain itself. So
 * the fake boundary records every parameter and the assertions read them.
 *
 * The other half is the Stripe Customer, which is the one piece of durable state either
 * path writes. It is created once and kept for life — `orgs.stripe_customer_id` is
 * unique — so the test that matters is the one that goes through both doors and finds the
 * same Customer at each.
 */

const password = "correct-horse-battery-staple";
const run = crypto.randomUUID().slice(0, 8);

const service = createServiceClient();

const origin = "https://app.example.test";

let orgId = "";

const admin = { id: "", email: `checkout-admin-${run}@example.test` };
const member = { id: "", email: `checkout-member-${run}@example.test` };

/** A boundary that records what it was asked for and answers plausibly. */
function recordingBoundary(): StripeBoundary & {
  created: { orgId: string; name: string }[];
  sessions: CheckoutParams[];
  portals: { customerId: string; returnUrl: string }[];
} {
  const created: { orgId: string; name: string }[] = [];
  const sessions: CheckoutParams[] = [];
  const portals: { customerId: string; returnUrl: string }[] = [];

  return {
    created,
    sessions,
    portals,
    async createCustomer(input) {
      created.push(input);

      return { id: `cus_${run}_${created.length}` };
    },
    async createCheckoutSession(params) {
      sessions.push(params);

      return { url: "https://checkout.stripe.test/session" };
    },
    async createPortalSession(params) {
      portals.push(params);

      return { url: "https://billing.stripe.test/portal" };
    },
    retrieveSubscription: () => unreachable(),
    retrieveTrialDays: () => unreachable(),
  };
}

/** A boundary that will not talk to Stripe at all — the `stripe_failed` case. */
function failingBoundary(): StripeBoundary {
  return {
    ...recordingBoundary(),
    createCustomer: async () => {
      throw new Error("Stripe is not answering");
    },
    createCheckoutSession: async () => {
      throw new Error("Stripe is not answering");
    },
    createPortalSession: async () => {
      throw new Error("Stripe is not answering");
    },
  };
}

function unreachable(): never {
  throw new Error("the checkout path must not reach this call");
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

async function customerOnRow(): Promise<string | null> {
  const { data, error } = await service
    .from("orgs")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (error) throw error;

  return data.stripe_customer_id as string | null;
}

beforeAll(async () => {
  const { data, error } = await service
    .from("orgs")
    .insert({ name: `Checkout ${run}` })
    .select("id")
    .single();

  if (error) throw error;

  orgId = data.id;

  // Two live Memberships, which is the floor every quantity below is measured against.
  await createPerson(admin, { name: "Checkout admin", isOrgAdmin: true });
  await createPerson(member, { name: "Checkout member", isOrgAdmin: false });
});

afterAll(async () => {
  const ids = [admin.id, member.id].filter(Boolean);

  await service.from("users").delete().in("id", ids);

  for (const id of ids) await service.auth.admin.deleteUser(id);

  await service.from("orgs").delete().eq("id", orgId);

  vi.unstubAllEnvs();
});

beforeEach(async () => {
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("STRIPE_PRICE_ID", `price_${run}`);

  const { error } = await service
    .from("orgs")
    .update({ stripe_customer_id: null })
    .eq("id", orgId);

  if (error) throw error;
});

describe("startCheckout", () => {
  it("tells Stripe exactly what to sell, and where to send the buyer back", async () => {
    const boundary = recordingBoundary();

    const result = await startCheckout(
      { quantity: 4 },
      await signedInAs(admin.email),
      boundary,
    );

    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.test/session" });

    const [session] = boundary.sessions;

    expect(session).toEqual({
      customerId: `cus_${run}_1`,
      orgId,
      priceId: `price_${run}`,
      quantity: 4,
      // Two live Memberships. Repeated to Stripe as the adjustable floor, so the buyer
      // cannot walk under it on the hosted page either.
      minimum: 2,
      successUrl: `${origin}/settings/billing?checkout=success`,
      cancelUrl: `${origin}/settings/billing?checkout=cancelled`,
    });
  });

  it("refuses a subscription for fewer people than the organisation already has", async () => {
    // Not "that number is invalid" — the organisation would be over its cap the moment
    // the subscription was paid for, and the refusal would surface weeks later at an
    // invite with nothing on screen connecting the two.
    const boundary = recordingBoundary();

    const result = await startCheckout(
      { quantity: 1 },
      await signedInAs(admin.email),
      boundary,
    );

    expect(result).toEqual({ ok: false, reason: "too_few" });
    // And nothing was created in Stripe on the way to refusing.
    expect(boundary.sessions).toEqual([]);
    expect(boundary.created).toEqual([]);
  });

  it("refuses an organisation that is already paying", async () => {
    // The screen hides the offer once the row says a subscription pays for people, and
    // this is the public endpoint behind it: a second Checkout for the same Customer is
    // a second subscription, billed twice for the same colleagues. The Portal is where a
    // paying organisation changes what it pays for.
    const { error } = await service
      .from("orgs")
      .update({
        stripe_subscription_id: `sub_paying_${run}`,
        stripe_subscription_status: "active",
        paid_memberships: 2,
      })
      .eq("id", orgId);

    if (error) throw error;

    try {
      const boundary = recordingBoundary();

      const result = await startCheckout(
        { quantity: 2 },
        await signedInAs(admin.email),
        boundary,
      );

      expect(result).toEqual({ ok: false, reason: "already_paying" });
      expect(boundary.sessions).toEqual([]);
    } finally {
      await service
        .from("orgs")
        .update({
          stripe_subscription_id: null,
          stripe_subscription_status: null,
          paid_memberships: null,
        })
        .eq("id", orgId);
    }
  });

  it.each([0, -3, 2.5, Number.NaN])("refuses a quantity of %s", async (quantity) => {
    // The box is a number input and this is a public endpoint; neither fact makes the
    // value a whole number of people.
    const result = await startCheckout(
      { quantity },
      await signedInAs(admin.email),
      recordingBoundary(),
    );

    expect(result).toEqual({ ok: false, reason: "too_few" });
  });

  it("sells to the number the organisation actually has, when that is the number asked", async () => {
    const boundary = recordingBoundary();

    const result = await startCheckout(
      { quantity: 2 },
      await signedInAs(admin.email),
      boundary,
    );

    expect(result.ok).toBe(true);
    expect(boundary.sessions[0]?.quantity).toBe(2);
  });

  it("refuses somebody who is not an Org Admin", async () => {
    const boundary = recordingBoundary();

    const result = await startCheckout(
      { quantity: 4 },
      await signedInAs(member.email),
      boundary,
    );

    expect(result).toEqual({ ok: false, reason: "not_admin" });
    expect(boundary.sessions).toEqual([]);
  });

  it("refuses when the app does not know its own address", async () => {
    // Checkout needs two absolute URLs to come back to and there is no request here to
    // reconstruct one from (#59). A `success_url` built against a guess sends a paying
    // customer somewhere they cannot be brought back from.
    vi.stubEnv("APP_ORIGIN", "");

    const result = await startCheckout(
      { quantity: 4 },
      await signedInAs(admin.email),
      recordingBoundary(),
    );

    expect(result).toEqual({ ok: false, reason: "no_origin" });
  });

  it("refuses when Stripe will not answer, and says nothing about which step failed", async () => {
    const result = await startCheckout(
      { quantity: 4 },
      await signedInAs(admin.email),
      failingBoundary(),
    );

    expect(result).toEqual({ ok: false, reason: "stripe_failed" });
  });
});

describe("openPortal", () => {
  it("refuses an organisation that has never bought anything", async () => {
    // Not a failure: there is no billing to manage. A Customer minted here to show
    // somebody an empty portal would be a Stripe record for an organisation that has
    // never bought anything.
    const boundary = recordingBoundary();

    const result = await openPortal(await signedInAs(admin.email), boundary);

    expect(result).toEqual({ ok: false, reason: "no_customer" });
    expect(boundary.created).toEqual([]);
    expect(await customerOnRow()).toBeNull();
  });

  it("refuses somebody who is not an Org Admin", async () => {
    const result = await openPortal(await signedInAs(member.email), recordingBoundary());

    expect(result).toEqual({ ok: false, reason: "not_admin" });
  });

  it("refuses when the app does not know where to send them back to", async () => {
    vi.stubEnv("APP_ORIGIN", "");

    const result = await openPortal(await signedInAs(admin.email), recordingBoundary());

    expect(result).toEqual({ ok: false, reason: "no_origin" });
  });
});

describe("the organisation's Stripe Customer", () => {
  it("is created once and found again by both doors", async () => {
    // The one piece of durable state either path writes, and the reason the two
    // functions live in one file. `orgs.stripe_customer_id` is unique, so a second
    // Customer for one organisation would mean two subscriptions each answering for a row
    // the other is also answering for.
    const boundary = recordingBoundary();
    const store = await signedInAs(admin.email);

    await startCheckout({ quantity: 3 }, store, boundary);

    const customerId = await customerOnRow();

    expect(customerId).toBe(`cus_${run}_1`);
    // Stamped with the organisation, so Stripe's own dashboard can answer "who is this"
    // without this database — and so the webhook can find the org before the stamp lands.
    expect(boundary.created).toEqual([{ orgId, name: `Checkout ${run}` }]);

    await startCheckout({ quantity: 5 }, store, boundary);

    const portal = await openPortal(store, boundary);

    expect(portal).toEqual({ ok: true, url: "https://billing.stripe.test/portal" });
    // Still one create, and every later call reaches for the same id.
    expect(boundary.created).toHaveLength(1);
    expect(boundary.sessions.map((session) => session.customerId)).toEqual([
      customerId,
      customerId,
    ]);
    expect(boundary.portals).toEqual([
      { customerId, returnUrl: `${origin}/settings/billing` },
    ]);
  });
});
