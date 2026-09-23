import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createServiceClient } from "@/lib/supabase/service-client";

import type { StripeBoundary, SubscriptionSnapshot } from "./stripe";
import {
  applySubscription,
  handleStripeEvent,
  isPaying,
  subscriptionPlan,
  webhookStatus,
} from "./subscription";

/**
 * The webhook's half of #180, against the real local Postgres.
 *
 * Two claims are checked here and the second is the reason the file is long. The first is
 * ordinary: each Stripe status puts an organisation on the plan it should, and the
 * columns that go with it are written together.
 *
 * The second is the one that cannot be checked any other way — **that delivery order and
 * delivery count do not matter**. Stripe delivers at least once and promises no order, so
 * a webhook is correct only if applying the same snapshot twice changes nothing and
 * applying an old snapshot after a newer one still writes what Stripe said. Both are
 * staged below against a real row, because both are about what the *row* ends up holding
 * and neither survives being lifted out of the database.
 *
 * The organisations here start on the seeded `free` row and are moved between the seeded
 * `free` and `paid` rows by the code under test, which is what it does in production —
 * so unlike `members.test.ts` there is no run-scoped plan to insert. Those two rows are
 * read by every suite running beside this one and are never written here.
 */

const run = crypto.randomUUID().slice(0, 8);

const service = createServiceClient();

/** The organisation the app already knows the Stripe Customer of — the ordinary route. */
const known = { orgId: "", customerId: `cus_known_${run}` };

/**
 * An organisation with no customer id on its row, reachable only through the metadata the
 * Checkout Session stamped onto the subscription — the first-checkout route.
 */
const unstamped = { orgId: "", customerId: `cus_unstamped_${run}` };

const trialEndsAt = "2026-10-01T00:00:00+00:00";

function snapshot(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    id: `sub_${run}`,
    customerId: known.customerId,
    status: "active",
    quantity: 5,
    orgId: null,
    ...overrides,
  };
}

type OrgRow = {
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  paid_memberships: number | null;
  trial_ends_at: string | null;
};

async function readOrg(orgId: string): Promise<OrgRow> {
  const { data, error } = await service
    .from("orgs")
    .select(
      "plan_id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, paid_memberships, trial_ends_at",
    )
    .eq("id", orgId)
    .single();

  if (error) throw error;

  return data as OrgRow;
}

/** Put the known org back where every test below starts: on a trial, paying nobody. */
async function resetKnown(): Promise<void> {
  const { error } = await service
    .from("orgs")
    .update({
      plan_id: "free",
      stripe_customer_id: known.customerId,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
      paid_memberships: null,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", known.orgId);

  if (error) throw error;
}

/** A boundary that answers one subscription and records what was asked for. */
function boundaryAnswering(sub: SubscriptionSnapshot | null): StripeBoundary & {
  asked: string[];
} {
  const asked: string[] = [];

  return {
    asked,
    async retrieveSubscription(id) {
      asked.push(id);

      return sub;
    },
    retrieveTrialDays: () => unreachable(),
    createCustomer: () => unreachable(),
    createCheckoutSession: () => unreachable(),
    createPortalSession: () => unreachable(),
  };
}

function unreachable(): never {
  throw new Error("the webhook path must not reach this call");
}

beforeAll(async () => {
  const { data, error } = await service
    .from("orgs")
    .insert([
      { name: `Billing known ${run}`, stripe_customer_id: known.customerId },
      { name: `Billing unstamped ${run}` },
    ])
    .select("id, name");

  if (error) throw error;

  known.orgId = data.find((row) => row.name.startsWith("Billing known"))!.id;
  unstamped.orgId = data.find((row) => row.name.startsWith("Billing unstamped"))!.id;
});

afterAll(async () => {
  await service.from("orgs").delete().in("id", [known.orgId, unstamped.orgId]);
});

beforeEach(resetKnown);

describe("subscriptionPlan", () => {
  it("counts the three paying words as paid", () => {
    // `past_due` among them: a failed payment does not switch the money off while Stripe
    // is still retrying the card. How long that lasts is a dunning setting in Stripe,
    // which is where every commercial term for this product lives.
    expect(subscriptionPlan("active")).toBe("paid");
    expect(subscriptionPlan("trialing")).toBe("paid");
    expect(subscriptionPlan("past_due")).toBe("paid");
  });

  it("counts every ending and never-started word as free", () => {
    expect(subscriptionPlan("canceled")).toBe("free");
    expect(subscriptionPlan("unpaid")).toBe("free");
    expect(subscriptionPlan("incomplete")).toBe("free");
    expect(subscriptionPlan("incomplete_expired")).toBe("free");
    expect(subscriptionPlan("paused")).toBe("free");
  });

  it("counts a word it has never heard of as free", () => {
    // Stripe owns this vocabulary and may extend it. An unknown word has to land
    // somewhere, and `free` is the direction a mistake is survivable in: an organisation
    // refused an upgrade files a ticket, and one silently upgraded never does.
    expect(subscriptionPlan("something_stripe_added_later")).toBe("free");
    expect(subscriptionPlan("")).toBe("free");
  });
});

describe("isPaying", () => {
  it("answers the same question as the plan mapping, and no for no subscription", () => {
    expect(isPaying("active")).toBe(true);
    expect(isPaying("past_due")).toBe(true);
    expect(isPaying("canceled")).toBe(false);
    expect(isPaying(null)).toBe(false);
  });
});

describe("webhookStatus", () => {
  it("asks Stripe to redeliver only what a redelivery can fix", () => {
    // A database that did not answer will; a subscription nobody here owns will not.
    expect(webhookStatus({ handled: true, report: { applied: false, reason: "write_failed" } })).toBe(500);
    expect(webhookStatus({ handled: true, report: { applied: false, reason: "unknown_org" } })).toBe(200);
    expect(webhookStatus({ handled: true, report: { applied: false, reason: "superseded" } })).toBe(200);
    expect(webhookStatus({ handled: true, report: { applied: true, orgId: "x", planId: "paid" } })).toBe(200);
    expect(webhookStatus({ handled: false })).toBe(200);
  });
});

describe("applySubscription", () => {
  it("puts a paying organisation on the paid plan and records what it pays for", async () => {
    const report = await applySubscription(snapshot({ quantity: 5 }));

    expect(report).toEqual({ applied: true, orgId: known.orgId, planId: "paid" });

    const row = await readOrg(known.orgId);

    expect(row.plan_id).toBe("paid");
    expect(row.paid_memberships).toBe(5);
    expect(row.stripe_subscription_id).toBe(`sub_${run}`);
    expect(row.stripe_subscription_status).toBe("active");
    // The trial converted. It is the one moment the date is cleared, and it is cleared
    // because the organisation is now paying rather than trialling — leaving it behind
    // would leave the daily cron a date to lapse a paying customer on.
    expect(row.trial_ends_at).toBeNull();
  });

  it("keeps a past_due organisation paid, and says so in Stripe's own word", async () => {
    const row = await applyAndRead(snapshot({ status: "past_due", quantity: 4 }));

    expect(row.plan_id).toBe("paid");
    expect(row.paid_memberships).toBe(4);
    // Stored verbatim so the screen can say something true about a failed payment
    // without this app inventing a vocabulary Stripe would then disagree with.
    expect(row.stripe_subscription_status).toBe("past_due");
  });

  it("lapses a cancelled organisation without erasing what happened", async () => {
    const row = await applyAndRead(snapshot({ status: "canceled", quantity: 5 }));

    expect(row.plan_id).toBe("free");
    // Nobody is paying, so nothing is paid for. Leaving the quantity behind would leave a
    // cap enforcing a number that is no longer bought.
    expect(row.paid_memberships).toBeNull();
    // The subscription and its status are kept: Stripe keeps the object, and so does this
    // row, so a lapse reads as a status rather than as an erasure.
    expect(row.stripe_subscription_id).toBe(`sub_${run}`);
    expect(row.stripe_subscription_status).toBe("canceled");
    // And the trial date survives, because it is the record that this organisation has
    // had its one trial. Cleared here, every cancellation would hand out another.
    expect(row.trial_ends_at).not.toBeNull();
  });

  it("caps at nothing when the subscription names no quantity", async () => {
    // Null rather than zero — `paid_memberships` refuses zero, and "we could not tell" is
    // the absence of a number everywhere else in this app.
    const row = await applyAndRead(snapshot({ quantity: null }));

    expect(row.plan_id).toBe("paid");
    expect(row.paid_memberships).toBeNull();
  });

  it("refuses a subscription belonging to nobody it can find", async () => {
    const report = await applySubscription(
      snapshot({ customerId: `cus_stranger_${run}`, orgId: null }),
    );

    expect(report).toEqual({ applied: false, reason: "unknown_org" });
  });

  it("refuses a subscription whose metadata names an organisation that is not here", async () => {
    const report = await applySubscription(
      snapshot({
        customerId: `cus_stranger_${run}`,
        orgId: "00000000-0000-4000-8000-000000000000",
      }),
    );

    expect(report).toEqual({ applied: false, reason: "unknown_org" });
  });

  it("finds an organisation by the metadata stamp, and stamps the customer on it", async () => {
    // The first checkout: the row has no customer id yet, because the subscription is the
    // first thing that exists. `metadata.org_id` was stamped onto it as the Session was
    // created for exactly this moment, and applying it writes the customer id so that
    // every later event takes the ordinary route.
    const report = await applySubscription(
      snapshot({
        id: `sub_first_${run}`,
        customerId: unstamped.customerId,
        orgId: unstamped.orgId,
      }),
    );

    expect(report).toEqual({ applied: true, orgId: unstamped.orgId, planId: "paid" });

    const row = await readOrg(unstamped.orgId);

    expect(row.stripe_customer_id).toBe(unstamped.customerId);
    expect(row.plan_id).toBe("paid");
  });

  it("writes the same row when the same event is delivered twice", async () => {
    // Stripe delivers at least once. A replay has to be a no-op, and it is one here
    // without any record of what has been seen: the write states the whole of what the
    // subscription says, so stating it again states the same thing.
    const first = await applyAndRead(snapshot({ quantity: 3 }));
    const second = await applyAndRead(snapshot({ quantity: 3 }));

    expect(second).toEqual(first);
  });

  it("applies an old snapshot arriving after a newer one, because it re-read Stripe", async () => {
    // The case a timestamp comparison would get wrong. Delivery order is not promised, so
    // the handler sees `canceled` and then `active` — and applying the `active` one is
    // *right*: the only way to hold that snapshot is to have just asked Stripe for it,
    // and what Stripe answers is what is true. The route re-reads on every event, so a
    // snapshot in hand is never older than the read that produced it.
    await applySubscription(snapshot({ status: "canceled" }));

    const row = await applyAndRead(snapshot({ status: "active", quantity: 2 }));

    expect(row.plan_id).toBe("paid");
    expect(row.paid_memberships).toBe(2);
    expect(row.stripe_subscription_status).toBe("active");
  });

  it("ignores the ending of a subscription the organisation has moved on from", async () => {
    // The one ordering the re-read cannot repair on its own: cancel, subscribe again, and
    // the old subscription's `deleted` lands after the new one's `created`. Re-reading
    // the old one truthfully says `canceled` — about a subscription that is no longer the
    // organisation's. A lapse is therefore applied only by the subscription the row
    // names; a paying snapshot always is, because paying is the newer fact either way.
    await applySubscription(snapshot({ status: "active", quantity: 4 }));

    const report = await applySubscription(
      snapshot({ id: `sub_old_${run}`, status: "canceled", quantity: 4 }),
    );

    expect(report).toEqual({ applied: false, reason: "superseded" });

    const row = await readOrg(known.orgId);

    expect(row.plan_id).toBe("paid");
    expect(row.paid_memberships).toBe(4);
    expect(row.stripe_subscription_id).toBe(`sub_${run}`);
  });
});

describe("handleStripeEvent", () => {
  it("reads the subscription named by a completed checkout session", async () => {
    const boundary = boundaryAnswering(snapshot());

    const result = await handleStripeEvent(
      {
        type: "checkout.session.completed",
        data: { object: { subscription: `sub_${run}` } },
      },
      boundary,
    );

    // The id came off the payload; nothing else did. The status and the quantity written
    // are the ones the boundary answered with.
    expect(boundary.asked).toEqual([`sub_${run}`]);
    expect(result.handled).toBe(true);
    expect(result.report).toEqual({ applied: true, orgId: known.orgId, planId: "paid" });
  });

  it("reads it when the session carries the subscription expanded", async () => {
    const boundary = boundaryAnswering(snapshot());

    await handleStripeEvent(
      {
        type: "checkout.session.completed",
        data: { object: { subscription: { id: `sub_${run}` } } },
      },
      boundary,
    );

    expect(boundary.asked).toEqual([`sub_${run}`]);
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ])("reads the subscription named by %s", async (type) => {
    const boundary = boundaryAnswering(snapshot({ status: "canceled" }));

    const result = await handleStripeEvent(
      { type, data: { object: { id: `sub_${run}` } } },
      boundary,
    );

    // `deleted` is not special-cased: it is re-read like the rest, and the status that
    // comes back is what decides the plan. One path, not four.
    expect(boundary.asked).toEqual([`sub_${run}`]);
    expect(result.report).toEqual({ applied: true, orgId: known.orgId, planId: "free" });
  });

  it("ignores an event type this app does not act on, without asking Stripe", async () => {
    // Invoices, payment intents and customer updates all say something the subscription's
    // own state already accounts for. Handling them too would be a second, slower answer
    // to a question the first one settles.
    const boundary = boundaryAnswering(snapshot());

    const result = await handleStripeEvent(
      { type: "invoice.paid", data: { object: { id: "in_123" } } },
      boundary,
    );

    expect(result).toEqual({ handled: false });
    expect(boundary.asked).toEqual([]);
  });

  it("handles nothing when the session names no subscription", async () => {
    const boundary = boundaryAnswering(snapshot());

    const result = await handleStripeEvent(
      { type: "checkout.session.completed", data: { object: { subscription: null } } },
      boundary,
    );

    expect(result).toEqual({ handled: false });
    expect(boundary.asked).toEqual([]);
  });

  it("handles nothing when Stripe could not be re-read, and writes nothing", async () => {
    // Not an error, and nothing to retry by hand: the route answers Stripe accordingly
    // and the delivery comes back. Writing a plan from a failed read is the one outcome
    // worth any amount of silence to avoid.
    const result = await handleStripeEvent(
      { type: "customer.subscription.updated", data: { object: { id: `sub_${run}` } } },
      boundaryAnswering(null),
    );

    expect(result).toEqual({ handled: false });
    expect((await readOrg(known.orgId)).plan_id).toBe("free");
  });
});

async function applyAndRead(sub: SubscriptionSnapshot): Promise<OrgRow> {
  const report = await applySubscription(sub);

  if (!report.applied) throw new Error(`not applied: ${report.reason}`);

  return readOrg(report.orgId);
}
