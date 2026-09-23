import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { subscriptionSnapshot } from "./stripe";

/**
 * The one part of the Stripe boundary that can be checked without Stripe: the mapping
 * from their subscription object to the five facts this app acts on.
 *
 * Everything else in that file is one call each to a hosted API, and a test of those
 * would be a test of a fake this file wrote. The mapping is different — it is the place
 * the boundary can be *quietly* wrong, and each way it can be wrong writes a plan against
 * the wrong organisation or reads a quantity that is not there. None of those shows up on
 * a screen; they show up as an organisation billed for five people and allowed twenty.
 *
 * The fixtures are cast rather than built whole: a `Stripe.Subscription` carries dozens
 * of fields this mapping never reads, and writing them out would be inventing values to
 * make a type happy and then implying they were checked.
 */

function subscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    items: { data: [{ quantity: 5 }] },
    metadata: { org_id: "org-1" },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("subscriptionSnapshot", () => {
  it("reads the five facts off an ordinary subscription", () => {
    expect(subscriptionSnapshot(subscription())).toEqual({
      id: "sub_123",
      customerId: "cus_123",
      status: "active",
      quantity: 5,
      orgId: "org-1",
    });
  });

  it("takes the customer's id whether it arrives as an id or as the customer", () => {
    // Stripe hands back a string unexpanded and an object expanded, and an object again
    // for a deleted customer. Read the wrong way round this is `[object Object]` in a
    // `stripe_customer_id` column with a unique index on it — a row that matches nothing
    // ever again, and an organisation whose webhook silently stops finding it.
    const snapshot = subscriptionSnapshot(
      subscription({ customer: { id: "cus_expanded", object: "customer" } }),
    );

    expect(snapshot.customerId).toBe("cus_expanded");
  });

  it("answers no quantity at all for a subscription with no line items", () => {
    // Null rather than zero. Zero would reach `paid_memberships`, whose CHECK refuses it
    // — and if it did not, it would be a cap allowing nobody, which is not what "we could
    // not tell" means. Null is the absence of a number everywhere else in this app.
    expect(subscriptionSnapshot(subscription({ items: { data: [] } })).quantity).toBeNull();
  });

  it("answers no organisation for a subscription nobody stamped", () => {
    // A subscription created in the Stripe dashboard by hand has no metadata. It is not
    // an error here: `applySubscription` still finds the org by its customer id, and only
    // refuses `unknown_org` when neither route answers.
    expect(subscriptionSnapshot(subscription({ metadata: {} })).orgId).toBeNull();
  });

  it("keeps a status it has never heard of, rather than refusing it", () => {
    // The vocabulary is Stripe's and they may add to it. Kept verbatim so the mapping in
    // `subscription.ts` is the only place a word is judged, and an unknown one lands on
    // `free` there rather than throwing here.
    expect(subscriptionSnapshot(subscription({ status: "something_new" })).status).toBe(
      "something_new",
    );
  });
});
