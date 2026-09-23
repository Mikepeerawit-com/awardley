import "server-only";

import Stripe from "stripe";

import { requiredEnv } from "@/lib/env";

/**
 * Everything this app says to Stripe, in one place, behind one injectable type.
 *
 * **The app never touches a card.** Every payment detail is entered on Stripe's own
 * hosted pages — Checkout to subscribe, the Customer Portal to change a card or a
 * quantity — so no card number, no CVC and no PAN ever reaches this origin, this
 * database or these logs. That is the whole reason those two hosted surfaces are used
 * rather than an embedded form: it is not a shortcut, it is the scope of what this
 * codebase is allowed to be responsible for.
 *
 * **Stripe is the source of truth and the org row is a read model.** Nothing here writes
 * a plan. The webhook re-reads a subscription through {@link StripeBoundary.retrieveSubscription}
 * and `subscription.ts` writes absolute state from what comes back, which is what makes a
 * replayed or out-of-order event harmless without a table of event ids.
 *
 * ## The fourth stubbed outbound boundary
 *
 * A type with an implementation beside it, injected as an argument, exactly as the WeCom
 * robot, the Resend send and the Frankfurter fetch are — this is the fourth, and the note
 * in `vitest.config.mts` lists them. Tests stand at this type and hand in a fake.
 * **Nothing stubs `fetch` globally** (ADR-0012): every path that reaches Stripe also talks
 * to Postgres over HTTP, and taking `fetch` out from under the whole process takes
 * `supabase-js` with it.
 *
 * ## Reads answer null; writes throw
 *
 * One rule, so a caller never has to guess which it is holding. The two reads answer
 * `null` when they cannot answer at all — an unreachable Stripe and a subscription that
 * does not exist are the same situation to the webhook, which reports the event unhandled
 * and lets Stripe's own retry be the recovery. The three writes throw, because each one
 * is a person standing in front of a button: `checkout.ts` catches and refuses with
 * `stripe_failed`, which is a sentence that fits on the screen they are looking at.
 *
 * ## The keys and the price are environment, per call
 *
 * `STRIPE_SECRET_KEY` is read on each call rather than captured at module load, the way
 * `requiredEnv` is written to be used: a value captured at import time is one a test
 * cannot pin. `STRIPE_PRICE_ID` is read by the caller for the same reason, and neither is
 * ever `NEXT_PUBLIC_`. Prices, trial length, currency and dunning are commercial terms
 * configured in Stripe and never in this repository — the sentence the #179 migration
 * wrote, kept.
 */

/**
 * A subscription reduced to the five facts this app acts on.
 *
 * Reduced rather than passed through, because a `Stripe.Subscription` is a large object
 * whose shape moves with their API version, and every field of it that reached the
 * database would be a field somebody had to keep in step. These five are what the plan is
 * computed from and nothing else is stored.
 */
export type SubscriptionSnapshot = {
  id: string;
  customerId: string;
  /**
   * Stripe's own word, kept as a `string` rather than narrowed to their union. The
   * vocabulary is theirs and they may add to it; a type that refused a new word would
   * turn their release into this app's outage, and the mapping in `subscription.ts`
   * already sends every unrecognised word to `free`, which is the safe direction.
   */
  status: string;
  /** How many people it pays for — the first line item's quantity. Null when it has none. */
  quantity: number | null;
  /** The organisation it was bought for, from `metadata.org_id`. Null when unstamped. */
  orgId: string | null;
};

/** What a Checkout Session needs. `minimum` is the floor the buyer may adjust down to. */
export type CheckoutParams = {
  customerId: string;
  orgId: string;
  priceId: string;
  quantity: number;
  minimum: number;
  successUrl: string;
  cancelUrl: string;
};

export type StripeBoundary = {
  retrieveSubscription(id: string): Promise<SubscriptionSnapshot | null>;
  /** The Price's `recurring.trial_period_days`. Null when the Price offers no trial. */
  retrieveTrialDays(priceId: string): Promise<number | null>;
  createCustomer(input: { orgId: string; name: string }): Promise<{ id: string }>;
  createCheckoutSession(params: CheckoutParams): Promise<{ url: string }>;
  createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
};

/**
 * The most people one Checkout Session may be adjusted up to.
 *
 * Not a commercial limit and not a cap on anything the plan means — it is the ceiling on
 * a number box on a page this app does not draw. An organisation that genuinely needs
 * more than this is a conversation, not a form, and a session with no ceiling is one
 * where a slipped keypress bills somebody for a thousand times what they meant to buy.
 */
const maxAdjustableQuantity = 999;

/**
 * The five facts, read off a subscription as Stripe hands it over.
 *
 * Exported so it can be checked without a network: the three places this mapping can be
 * silently wrong — a customer that arrives expanded rather than as an id, a subscription
 * with no line items, metadata that was never stamped — are each a plan written against
 * the wrong organisation or no organisation at all, and none of them shows up on a
 * screen.
 */
export function subscriptionSnapshot(sub: Stripe.Subscription): SubscriptionSnapshot {
  return {
    id: sub.id,
    // A string when unexpanded, an object when expanded, and a deleted customer is an
    // object too. All three carry the id, which is the only part used.
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status,
    // The first line item, because this product sells one Price per subscription. A
    // subscription with none is not this app's and answers `null`, which maps to no cap
    // rather than to a cap of zero.
    quantity: sub.items.data[0]?.quantity ?? null,
    orgId: sub.metadata?.org_id ?? null,
  };
}

/** The real boundary. Every call makes its own client, so the key is read per call. */
export function stripeBoundary(): StripeBoundary {
  return {
    async retrieveSubscription(id) {
      try {
        return subscriptionSnapshot(await client().subscriptions.retrieve(id));
      } catch (error) {
        // Null is Stripe saying there is no such subscription — the one read failure a
        // redelivery will not change, so the webhook learns nothing and changes nothing.
        // Everything else — the network, a 5xx, a bad key — is thrown, so the route can
        // answer with the status Stripe redelivers on rather than skipping the event.
        // Writing a plan from a failed read is the one outcome worth avoiding either way.
        if (isMissing(error)) return null;
        throw error;
      }
    },

    async retrieveTrialDays(priceId) {
      try {
        const price = await client().prices.retrieve(priceId);

        // `trial_period_days` is `null` on a Price with no trial configured, which is a
        // real and ordinary answer: the business turns the trial off by changing the
        // Price in Stripe, with no deploy here. `trial.ts` refuses `no_trial` on it.
        return price.recurring?.trial_period_days ?? null;
      } catch {
        return null;
      }
    },

    async createCustomer({ orgId, name }) {
      // `metadata.org_id` is what lets a Stripe dashboard answer "who is this" without
      // this database, and what lets the webhook find an organisation whose customer id
      // has not been stamped on the row yet.
      const customer = await client().customers.create({
        name,
        metadata: { org_id: orgId },
      });

      return { id: customer.id };
    },

    async createCheckoutSession(params) {
      // No `subscription_data.trial_period_days`, and none is inherited from the Price:
      // a Price's own `recurring.trial_period_days` applies only to subscriptions created
      // with `trial_from_plan`, which Checkout does not set. The card-less trial was the
      // trial (ADR-0041); the day somebody subscribes, they pay.
      const session = await client().checkout.sessions.create({
        mode: "subscription",
        customer: params.customerId,
        // Two stamps of the same fact, because they land in two different places: the
        // reference rides on the Session and the metadata rides on the Subscription the
        // Session creates, and it is the Subscription the webhook re-reads.
        client_reference_id: params.orgId,
        subscription_data: { metadata: { org_id: params.orgId } },
        line_items: [
          {
            price: params.priceId,
            quantity: params.quantity,
            // The buyer may change how many people they are paying for on Stripe's page,
            // but never below the number the organisation already has: a subscription
            // sold for fewer people than are live is a cap breached the moment it is paid
            // for, and the refusal would land on somebody who had done nothing wrong.
            adjustable_quantity: {
              enabled: true,
              minimum: params.minimum,
              maximum: maxAdjustableQuantity,
            },
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      });

      // Documented as nullable because a Session can be created in modes that have no
      // hosted page. This one is always `subscription`, so a null here is Stripe telling
      // us something we have no sentence for — and a redirect to `null` is a broken page.
      if (session.url === null) throw new Error("Stripe returned a Session with no URL");

      return { url: session.url };
    },

    async createPortalSession({ customerId, returnUrl }) {
      const session = await client().billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    },
  };
}

/** Stripe's "no such object", which is the only read failure that is an answer. */
function isMissing(error: unknown): boolean {
  return error instanceof Stripe.errors.StripeError && error.code === "resource_missing";
}

function client(): Stripe {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
}
