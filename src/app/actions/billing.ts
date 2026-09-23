"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  checkoutRefusals,
  openPortal,
  portalRefusals,
  startCheckout,
} from "@/lib/billing/checkout";
import { stripeBoundary } from "@/lib/billing/stripe";
import { startTrial, trialRefusals } from "@/lib/billing/trial";
import { runInstantFromHeaders } from "@/lib/run-instant";

/**
 * The three things an Administrator can do about paying, as endpoints.
 *
 * **Every one of them is a public endpoint and none of them is the gate.** A Server
 * Action is an address anybody can post to, so the question of who may start a trial or
 * open a checkout is answered inside `startTrial`, `startCheckout` and `openPortal` —
 * the same place the Billing screen's `notFound()` is a second answer to, and never the
 * only one. What lives here is the translation between a form and a lib call.
 *
 * **Two of the three end in a redirect to Stripe rather than a status.** `redirect()`
 * throws to unwind the request, so it is called after the refusal branch has already
 * returned and never from inside a `try` — an action that wrapped it would catch Next's
 * own control-flow error and turn a successful checkout into a silent nothing. It is the
 * same shape `quotes.ts` states: one or the other, never both.
 *
 * **The trial is the exception and returns nothing on success**, because there is
 * nowhere to send anybody: the card-less trial is a plan state rather than a visit to
 * Stripe, so what the Administrator needs to see is this screen again with the trial's
 * end date on it. `revalidatePath` is what redraws it.
 *
 * The refusal unions are derived from the lib's own arrays rather than retyped, so a
 * reason added there arrives here as a state the screen must have wording for — and
 * `messages.test.ts` is what turns a missing sentence into a failing test rather than a
 * `billing.status.no_trial` rendered at somebody mid-purchase.
 *
 * The instant is resolved at the boundary and passed down, never read inside the write
 * (ADR-0010): a trial's end date is arithmetic on *when this request ran*, which is the
 * one thing a test has to be able to pin.
 */

export type TrialState = { status?: (typeof trialRefusals)[number] };

export type CheckoutState = { status?: (typeof checkoutRefusals)[number] };

export type PortalState = { status?: (typeof portalRefusals)[number] };

// Neither the previous state nor the form is read — the trial takes no input — and a
// function of fewer parameters is what `useActionState` accepts, so they are not named.
export async function startTrialAction(): Promise<TrialState> {
  const result = await startTrial(
    runInstantFromHeaders(await headers()),
    await cookies(),
    stripeBoundary(),
  );

  if (!result.ok) return { status: result.reason };

  // No sentence on success: the screen redrawn is the answer. It now says which day the
  // trial runs to and has no Start button left on it, which is more than a line of text
  // could say and is harder to disbelieve.
  revalidatePath("/settings/billing");

  return {};
}

export async function startCheckoutAction(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  // Whatever the box held, unparsed. A blank field is `0` and "eight" is `NaN`, and both
  // are refused by the one check in `startCheckout` that also refuses a number below the
  // live count — so there is no second opinion about what a valid quantity is, and no
  // way to reach Stripe with one this screen happened to like.
  const quantity = Number(String(formData.get("quantity") ?? ""));

  const result = await startCheckout({ quantity }, await cookies(), stripeBoundary());

  if (!result.ok) return { status: result.reason };

  redirect(result.url);
}

export async function openPortalAction(): Promise<PortalState> {
  const result = await openPortal(await cookies(), stripeBoundary());

  if (!result.ok) return { status: result.reason };

  redirect(result.url);
}
