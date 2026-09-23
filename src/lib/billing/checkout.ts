import "server-only";

import { appOrigin } from "@/lib/app-links";
import { currentUser } from "@/lib/auth/session";
import { requiredEnv } from "@/lib/env";
import { liveMembershipCount } from "@/lib/org/members";
import { createServiceClient } from "@/lib/supabase/service-client";
import type { SessionCookieStore } from "@/lib/supabase/session-client";

import type { StripeBoundary } from "./stripe";
import { isPaying } from "./subscription";

/**
 * The two ways an Org Admin leaves this app for Stripe: buying a subscription, and
 * managing the one they have.
 *
 * Both end the same way — a URL on Stripe's own domain that the caller redirects to — and
 * that is the point rather than a convenience. Every card detail, every change of card,
 * every cancellation and every quantity change happens on pages this codebase does not
 * serve, so no payment detail ever reaches this origin, this database or these logs.
 *
 * **Nothing here writes a plan.** A completed checkout changes nothing until Stripe says
 * so: the subscription webhook re-reads and writes the org row (`subscription.ts`), and
 * the success page says as much in plain words. A person can pay and come back to a
 * screen that has not caught up yet, which is correct — the alternative is this app
 * believing a payment that Stripe has not confirmed.
 *
 * **What changes in the Customer Portal comes back the same way.** An admin who adds two
 * more people to their subscription there is granted them by `customer.subscription.updated`
 * and by nothing this file does. That is why there is no "change quantity" function: a
 * second way to write the same fact is a second answer that will eventually disagree.
 *
 * **The Stripe Customer is created here, once, and kept for life.** It is the first thing
 * either path needs and the organisation may not have one yet, so it is created lazily
 * and stamped onto the row — with `metadata.org_id`, so that Stripe's own dashboard can
 * answer "who is this" without this database, and so that the webhook can find the
 * organisation before the stamp has landed.
 */

/**
 * How starting a checkout can end.
 *
 * `too_few` is the one worth naming carefully: it is not "that number is invalid", it is
 * "you cannot buy a subscription for fewer people than are already here". Selling one
 * would put the organisation over its cap the moment it was paid for, and the refusal
 * would then land on an admin inviting somebody, weeks later, with nothing on screen
 * connecting the two.
 *
 * `stripe_failed` covers every way the session could not be created, including the ones
 * that are this app's fault rather than Stripe's. They are one word because they are one
 * sentence to the person standing at the button — nothing was bought, try again — and
 * because a vocabulary that told them which internal step failed would be asking them to
 * do something about it.
 */
export const checkoutRefusals = [
  "not_admin",
  "no_origin",
  // The row already says a subscription pays for people. The screen has hidden the
  // offer by then, and this is the public endpoint behind the screen: a second Checkout
  // for the same Customer is a second subscription, billed twice for the same
  // colleagues. What a paying organisation changes, it changes in the Portal.
  "already_paying",
  "too_few",
  "stripe_failed",
] as const;

export type CheckoutRefusal = (typeof checkoutRefusals)[number];

/**
 * How opening the billing portal can end.
 *
 * `no_customer` rather than `stripe_failed`, because it is not a failure at all: an
 * organisation that has never subscribed and never started a checkout has no billing to
 * manage, and the honest answer is that there is nothing there yet. The screen draws the
 * button only when there is a customer, so this is the refusal for a POST that arrived
 * without one — which is exactly the case a gate in the page would have missed.
 */
export const portalRefusals = [
  "not_admin",
  "no_origin",
  "no_customer",
  "stripe_failed",
] as const;

export type PortalRefusal = (typeof portalRefusals)[number];

export type HostedPageResult<Refusal> =
  | { ok: true; url: string }
  | { ok: false; reason: Refusal };

/** Where Stripe sends the buyer back to, either way. The screen reads the query. */
const returnPath = "/settings/billing";

/**
 * Start a subscription checkout for this organisation, and answer where to send them.
 *
 * Org Admin-gated here rather than in the page, because a server action is a public HTTP
 * endpoint any signed-in member can POST to, and this one starts a purchase.
 *
 * The quantity arrives from a number box and is treated as untrusted: it must be a whole
 * number, at least one, and at least as many people as the organisation already has. That
 * floor is repeated to Stripe as `adjustable_quantity.minimum`, so the buyer cannot walk
 * under it on the hosted page either — the check here is for the POST that never went
 * near the page.
 *
 * A deployment with no `STRIPE_PRICE_ID` is refused as `stripe_failed` like any other
 * step that could not reach a Session: it cannot sell anything, and the missing variable
 * is found in the environment, not on an Administrator's screen.
 */
export async function startCheckout(
  { quantity }: { quantity: number },
  store: SessionCookieStore,
  boundary: StripeBoundary,
): Promise<HostedPageResult<CheckoutRefusal>> {
  const caller = await currentUser(store);

  if (!caller?.isOrgAdmin) return { ok: false, reason: "not_admin" };

  const { origin } = appOrigin();

  // Checkout needs two absolute URLs to come back to and there is no request here to
  // reconstruct one from — the same reason the daily run needs it (#59). Refused rather
  // than guessed: a `success_url` built against the wrong origin sends a paying customer
  // to a 404 they cannot be brought back from.
  if (origin === null) return { ok: false, reason: "no_origin" };

  // Before the count, because a paying organisation is refused whatever number it asks
  // for: the Portal is where it changes what it pays for, and a second Checkout would be
  // a second subscription.
  if (await alreadyPaying(caller.orgId)) return { ok: false, reason: "already_paying" };

  // "Could not be counted" falls back to one rather than to zero. Zero would let a
  // subscription be sold for nobody; one is the floor every organisation is above anyway,
  // and the cap check that matters is the one at the invite, not here.
  const minimum = Math.max(1, (await liveMembershipCount(caller.orgId)) ?? 1);

  if (!Number.isInteger(quantity) || quantity < minimum) {
    return { ok: false, reason: "too_few" };
  }

  try {
    const customerId = await customerFor(caller.orgId, boundary);

    const { url } = await boundary.createCheckoutSession({
      customerId,
      orgId: caller.orgId,
      priceId: requiredEnv("STRIPE_PRICE_ID"),
      quantity,
      minimum,
      // The query the screen reads. `success` says only that Stripe took the payment —
      // the plan changes when the webhook lands, which is what the page says in words.
      successUrl: `${origin}${returnPath}?checkout=success`,
      cancelUrl: `${origin}${returnPath}?checkout=cancelled`,
    });

    return { ok: true, url };
  } catch {
    return { ok: false, reason: "stripe_failed" };
  }
}

/**
 * Open Stripe's Customer Portal for this organisation.
 *
 * Everything an admin can do to a subscription they already have — change the card,
 * change how many people it pays for, cancel — happens there, on Stripe's pages, and
 * comes back to this app through the subscription webhook. There is deliberately nothing
 * in this repository that edits a subscription directly.
 */
export async function openPortal(
  store: SessionCookieStore,
  boundary: StripeBoundary,
): Promise<HostedPageResult<PortalRefusal>> {
  const caller = await currentUser(store);

  if (!caller?.isOrgAdmin) return { ok: false, reason: "not_admin" };

  const { origin } = appOrigin();

  if (origin === null) return { ok: false, reason: "no_origin" };

  const { data: org } = await createServiceClient()
    .from("orgs")
    .select("stripe_customer_id")
    .eq("id", caller.orgId)
    .maybeSingle();

  // Not created on demand here, unlike the checkout path: a portal is for managing
  // billing that exists, and minting a Customer to show somebody an empty one would leave
  // a Stripe record for an organisation that has never bought anything.
  if (!org?.stripe_customer_id) return { ok: false, reason: "no_customer" };

  try {
    const { url } = await boundary.createPortalSession({
      customerId: org.stripe_customer_id,
      returnUrl: `${origin}${returnPath}`,
    });

    return { ok: true, url };
  } catch {
    return { ok: false, reason: "stripe_failed" };
  }
}

/**
 * Whether a subscription already pays for this organisation — Stripe's status word off
 * the row the webhook keeps, read through the one mapping the screen and the cap also
 * use, so that "already paying" here and "on a paid plan" there are one fact. Unreadable
 * counts as paying: refusing a Checkout is the cheap mistake, and selling a second
 * subscription is not.
 */
async function alreadyPaying(orgId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("orgs")
    .select("stripe_subscription_status")
    .eq("id", orgId)
    .maybeSingle();

  if (error !== null || !data) return true;

  return isPaying(data.stripe_subscription_status as string | null);
}

/**
 * The organisation's Stripe Customer, created the first time anybody needs one.
 *
 * Read first and created only on a miss, so an organisation has exactly one for life —
 * `orgs.stripe_customer_id` is unique, and two Customers for one organisation would mean
 * each subscription answering for a row the other one is also answering for.
 *
 * The stamp is written straight after the create and its failure is not treated as the
 * checkout failing: the Session is still good, the subscription it creates carries
 * `metadata.org_id`, and `applySubscription` writes the customer id onto the row by that
 * route. The cost of a missed stamp is one duplicate Customer in Stripe; the cost of
 * refusing would be a customer who could not buy.
 *
 * @throws when the organisation cannot be read or Stripe will not create a Customer. The
 * callers catch and refuse `stripe_failed`.
 */
async function customerFor(orgId: string, boundary: StripeBoundary): Promise<string> {
  const service = createServiceClient();

  const { data: org, error } = await service
    .from("orgs")
    .select("name, stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (error !== null) throw error;

  if (org.stripe_customer_id !== null) return org.stripe_customer_id as string;

  // The organisation's own name, so an invoice and a Stripe dashboard say who this is
  // without anybody cross-referencing an id.
  const created = await boundary.createCustomer({ orgId, name: org.name as string });

  await service
    .from("orgs")
    .update({ stripe_customer_id: created.id })
    .eq("id", orgId);

  return created.id;
}
