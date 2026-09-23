import "server-only";

import { createServiceClient } from "@/lib/supabase/service-client";

import type { StripeBoundary, SubscriptionSnapshot } from "./stripe";

/**
 * What a Stripe subscription means for an organisation's plan, and the one write that
 * makes it true.
 *
 * ## Absolute state, never a diff
 *
 * Every write here states the *whole* of what the subscription says, computed from a
 * snapshot that was just re-read from Stripe. Nothing increments, nothing compares
 * against what the row held, nothing consults the event that woke us up.
 *
 * That single choice is what makes the webhook correct without any bookkeeping. Stripe
 * delivers at least once and does not promise order, so a naive handler needs a table of
 * seen event ids to survive a replay and a timestamp comparison to survive an
 * overtake — two mechanisms that are themselves wrong in ways nobody notices for months.
 * Here, a replayed event re-reads the same subscription and writes the same row twice,
 * and an event that arrives late re-reads the subscription *as it is now* and writes
 * today's truth. A stale `active` snapshot re-applied after a `canceled` one is therefore
 * applied in full and is *right* to be: the only way to hold such a snapshot is to have
 * asked Stripe for it, and what Stripe answered is what is true.
 *
 * ## The grace period is Stripe's, not ours
 *
 * `past_due` maps to `paid`, so a failed payment does not switch the Working Sheet's
 * money off while Stripe is still retrying the card. How long that lasts is a dunning
 * setting in Stripe — a commercial term, configured beside the prices and never in this
 * repository. When Stripe gives up it moves the subscription to `canceled` or `unpaid`
 * and this file lapses the organisation on the next event, with nothing deleted: a cap
 * refuses the next act and the surplus stays readable (ADR-0040).
 */

/**
 * The words that mean somebody is paying, or is inside something Stripe considers paid.
 *
 * A list rather than a bare union, the way every vocabulary in this app is written, so
 * that it can be read and walked. `trialing` is here for the subscription-attached trial
 * Stripe can run on a Price; the card-less trial this app starts itself is a different
 * thing entirely and lives in `trial.ts` with no subscription at all.
 *
 * **Everything not on this list is `free`, including words that do not exist yet.** The
 * status arrives as a string on purpose: Stripe owns the vocabulary and may extend it,
 * and an unknown word must land somewhere. It lands on `free` because that is the
 * direction a mistake is survivable in — an organisation refused an upgrade files a
 * ticket, and one silently upgraded never does.
 */
export const payingStatuses = ["active", "trialing", "past_due"] as const;

export type PayingStatus = (typeof payingStatuses)[number];

export type PlanId = "paid" | "free";

/**
 * Which plan a subscription in this state puts an organisation on.
 *
 * Pure, and separated from the write so that the mapping — the one judgement in this
 * file — can be read as a table rather than inferred from a database test.
 */
export function subscriptionPlan(status: string): PlanId {
  return (payingStatuses as readonly string[]).includes(status) ? "paid" : "free";
}

/**
 * Whether a subscription in this status pays for the organisation — the same mapping as
 * {@link subscriptionPlan}, asked as the question the screen and the Checkout gate need.
 * Null is no subscription at all. Deliberately *not* read off `paid_memberships`: a paying
 * subscription that names no quantity would read as unsubscribed there, and the one thing
 * that must never follow from that is a second Checkout for the same Customer.
 */
export function isPaying(status: string | null): boolean {
  return status !== null && subscriptionPlan(status) === "paid";
}

/**
 * What applying a snapshot did, said plainly enough for a webhook to log and a test to
 * assert on.
 *
 * The three refusals are different faults with different recoveries, which is why they
 * are not one word: `unknown_org` is a subscription this app has never heard of and will
 * not hear of by being asked again — somebody subscribed in the Stripe dashboard for an
 * organisation that does not exist here; `superseded` is the ending of a subscription the
 * organisation has already replaced, which a second delivery would only end again; and
 * `write_failed` is a database that did not answer, and is the one worth another
 * delivery — {@link webhookStatus} is what turns that into the status Stripe retries on.
 */
export type ApplyReport =
  | { applied: true; orgId: string; planId: PlanId }
  | { applied: false; reason: "unknown_org" | "superseded" | "write_failed" };

/**
 * Write what this subscription says onto the organisation it belongs to.
 *
 * **Two ways to find the organisation, and the order matters.** The customer id on the
 * row is the ordinary route and is tried first, because it is the identifier this app
 * itself stamped. `metadata.org_id` on the subscription is the fallback, and it is what
 * makes the very first checkout work: the row's `stripe_customer_id` may not be written
 * yet when the first `customer.subscription.created` lands, and the metadata was stamped
 * onto the subscription as the Session was created for exactly this moment. Finding an
 * organisation that way also stamps the customer id, so the fallback is needed once.
 *
 * **One update.** Every column the subscription speaks for is written together, including
 * the ones being cleared: `paid_memberships` goes to null on a lapse so a cancelled
 * subscription stops capping anything on a figure nobody is paying, and `trial_ends_at`
 * is cleared when a paying subscription applies, because the trial converted. On a lapse
 * the trial date is *kept* — it is the record that this organisation has had its one
 * trial, and clearing it would hand out a second.
 *
 * Written with the service client because `authenticated` cannot write `orgs` at all
 * (20260814010000). There is no caller to gate here: the gate on this path is the webhook
 * signature the route checks before anything reaches this file.
 */
export async function applySubscription(
  sub: SubscriptionSnapshot,
): Promise<ApplyReport> {
  const service = createServiceClient();

  const org = await orgFor(sub, service);

  if (org === null) return { applied: false, reason: "unknown_org" };

  const orgId = org.id;
  const planId = subscriptionPlan(sub.status);
  const paying = planId === "paid";

  // The one ordering the re-read cannot repair on its own. Cancel, subscribe again, and
  // the old subscription's `deleted` can land after the new one's `created`; re-reading
  // the old one truthfully answers `canceled` — about a subscription that is no longer
  // this organisation's. So a lapse is applied only by the subscription the row names.
  // A paying snapshot is never held back this way: paying is the newer fact whichever
  // subscription says it, and holding it back would be the direction that refuses a
  // customer who has just paid.
  if (
    !paying &&
    org.stripe_subscription_id !== null &&
    org.stripe_subscription_id !== sub.id
  ) {
    return { applied: false, reason: "superseded" };
  }

  const { data, error } = await service
    .from("orgs")
    .update({
      plan_id: planId,
      // Written every time rather than only when it is missing. It is already equal on
      // the ordinary route, and on the metadata route it is the stamp that makes the
      // ordinary route work from here on.
      stripe_customer_id: sub.customerId,
      stripe_subscription_id: sub.id,
      // Stripe's word, verbatim, so the screen can say something true about `past_due`
      // without this file having to invent a vocabulary of its own.
      stripe_subscription_status: sub.status,
      // Null on a lapse: a cancelled subscription pays for nobody, and leaving the old
      // quantity behind would leave a cap enforcing a number that is no longer bought.
      paid_memberships: paying ? sub.quantity : null,
      // Cleared only when somebody is paying — the trial converted. Kept on a lapse,
      // because a non-null date is the record that this organisation's one trial has been
      // used, and clearing it here would hand out a second on every cancellation.
      ...(paying ? { trial_ends_at: null } : {}),
    })
    .eq("id", orgId)
    .select("id");

  if (error !== null) return { applied: false, reason: "write_failed" };

  // Zero rows means the id came from metadata and names an organisation that is not
  // here — the same situation as no id at all, and the same word for it.
  if (data.length !== 1) return { applied: false, reason: "unknown_org" };

  return { applied: true, orgId, planId };
}

type OrgBillingRow = { id: string; stripe_subscription_id: string | null };

/**
 * The organisation a subscription belongs to: by the Customer the row already names,
 * else by the `org_id` the Checkout stamped into the subscription's metadata. The second
 * door exists for the first event about a brand-new Customer, when the stamp on the row
 * may not have landed yet — and walking through it is what writes the stamp.
 */
async function orgFor(
  sub: SubscriptionSnapshot,
  service: ReturnType<typeof createServiceClient>,
): Promise<OrgBillingRow | null> {
  const { data: byCustomer } = await service
    .from("orgs")
    .select("id, stripe_subscription_id")
    .eq("stripe_customer_id", sub.customerId)
    .maybeSingle();

  if (byCustomer) return byCustomer as OrgBillingRow;

  if (sub.orgId === null) return null;

  const { data: byMetadata } = await service
    .from("orgs")
    .select("id, stripe_subscription_id")
    .eq("id", sub.orgId)
    .maybeSingle();

  return (byMetadata as OrgBillingRow | null) ?? null;
}

/**
 * The event types that say something about a subscription.
 *
 * `checkout.session.completed` is the first news of a new one and names it on a different
 * field from the other three, which is the whole reason this list is not simply a prefix
 * match. Everything else Stripe sends — invoices, payment intents, customer updates — is
 * ignored: the subscription's state already accounts for all of it, and handling an
 * invoice as well would be a second, slower answer to a question the first one settles.
 */
/**
 * The HTTP status the route answers with, decided here so a test can hold it.
 *
 * Stripe retries anything that is not a 2xx for days. Exactly one outcome is worth that:
 * a write that failed, because a database that did not answer is one that will — catch
 * up rather than skip. Everything else is a 200, including the refusals, because an event
 * nothing listens to, a subscription nobody here owns and an ending already superseded do
 * not come right on the fourth delivery, and a 500 for them fills the dashboard's delivery
 * log with failures that are not.
 */
export function webhookStatus(outcome: { handled: boolean; report?: ApplyReport }): 200 | 500 {
  return outcome.report?.applied === false && outcome.report.reason === "write_failed"
    ? 500
    : 200;
}

export const subscriptionEventTypes = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export type SubscriptionEventType = (typeof subscriptionEventTypes)[number];

/** As much of a Stripe event as this file reads. The route verifies the signature. */
export type StripeEventShape = { type: string; data: { object: unknown } };

/**
 * Turn a verified Stripe event into a write, by asking Stripe what is true.
 *
 * **The payload is used for one thing only: which subscription to go and read.** Not its
 * status, not its quantity, not its customer. That is the rule stated at the top of this
 * file, and it is what a reader adding a fifth event type has to keep — the moment a
 * status is taken from an event body, replays and overtakes start writing yesterday's
 * truth over today's.
 *
 * `handled: false` is not an error. It is "this event said nothing this app acts on", and
 * covers an event type that is not ours as well as a subscription that could not be
 * re-read. A route that answers Stripe accordingly gets the failed read redelivered,
 * which is the recovery — there is nothing to record and nothing to retry by hand.
 */
export async function handleStripeEvent(
  event: StripeEventShape,
  boundary: StripeBoundary,
): Promise<{ handled: boolean; report?: ApplyReport }> {
  const id = subscriptionIdFrom(event);

  if (id === null) return { handled: false };

  const sub = await boundary.retrieveSubscription(id);

  if (sub === null) return { handled: false };

  return { handled: true, report: await applySubscription(sub) };
}

function subscriptionIdFrom(event: StripeEventShape): string | null {
  const object = event.data.object;

  if (object === null || typeof object !== "object") return null;

  const fields = object as { id?: unknown; subscription?: unknown };

  if (event.type === "checkout.session.completed") {
    // Stripe sends the subscription as an id, or as the whole object when the Session was
    // retrieved with it expanded. A Session in a mode other than `subscription` has none
    // at all, which is not ours and is not an error.
    return idOf(fields.subscription);
  }

  if ((subscriptionEventTypes as readonly string[]).includes(event.type)) {
    return idOf(fields.id);
  }

  return null;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;

  if (value !== null && typeof value === "object") {
    const { id } = value as { id?: unknown };

    return typeof id === "string" ? id : null;
  }

  return null;
}
