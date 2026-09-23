import Stripe from "stripe";

import { stripeBoundary } from "@/lib/billing/stripe";
import { handleStripeEvent, webhookStatus } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";

/**
 * Where Stripe tells the app what an organisation is paying for — and the one writer of
 * everything billing-shaped on `orgs` (#180, ADR-0041).
 *
 * The handler is deliberately thin, for the reason the cron route is: it decides whether
 * this really is Stripe calling, and hands the event to `handleStripeEvent`, which is
 * where the work lives because it stands at an outbound boundary the tests stub and a
 * route handler has nowhere to take one as an argument.
 *
 * **The event is a hint, not a fact.** Stripe signs what it sends, but it does not
 * promise to send it once or in order — a `customer.subscription.updated` from before a
 * cancellation can arrive after the `deleted`. So the handler never writes what the
 * payload says. It reads the subscription's id out of the event, asks Stripe for that
 * subscription *now*, and writes the answer as an absolute state. A replayed event
 * re-reads the same truth and writes the same row; a late one re-reads a newer truth
 * and cannot roll anything back. That is the whole of the idempotency story, and it is
 * why there is no table of event ids: the reminder sender's instinct — catch up rather
 * than skip — applied to a webhook.
 *
 * **Every answer past the signature is a 200, except the one a retry fixes.** Stripe
 * retries anything else for days. An event type nothing here listens to, a subscription
 * whose customer maps to no organisation, the ending of a subscription already replaced:
 * none of those comes right on the fourth attempt, so all are 200s, reported in the body
 * for the Stripe dashboard's event log to show. A database or a Stripe read that did not
 * answer is different — it will answer — and is the one thing sent back as a 500, so that
 * the redelivery catches up rather than the event being skipped.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;

  // A deployment with no signing secret refuses every call rather than trusting any,
  // and says nothing about why — the same closed default and the same silence as the
  // cron route. This endpoint moves organisations between plans; an unauthenticated
  // caller learning whether it is even wired up is a hint.
  if (!secret || !key) return new Response("Not found", { status: 404 });

  // The raw bytes, not a parsed body: the signature is over the text exactly as Stripe
  // sent it, and a re-serialised object would verify nothing.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    event = new Stripe(key).webhooks.constructEvent(payload, signature, secret);
  } catch {
    // Not a 404: a caller who got this far is one Stripe's own docs tell to expect a 400
    // for a bad signature, and a wrong secret on *our* side is the fault this status
    // makes visible in the dashboard's delivery log.
    return new Response("Bad signature", { status: 400 });
  }

  // A throw past this point is Stripe or Postgres not answering — the one kind of fault
  // a redelivery fixes — and is answered with the status Stripe retries on, exactly as a
  // write that reported its own failure is. `webhookStatus` holds the rule.
  let outcome: Awaited<ReturnType<typeof handleStripeEvent>>;

  try {
    outcome = await handleStripeEvent(event, stripeBoundary());
  } catch (error) {
    return Response.json(
      { status: "error", type: event.type, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }

  return Response.json(
    { status: "ok", type: event.type, ...outcome },
    { status: webhookStatus(outcome) },
  );
}
