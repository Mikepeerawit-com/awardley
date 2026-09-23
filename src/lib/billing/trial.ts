import "server-only";

import { currentUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service-client";
import type { SessionCookieStore } from "@/lib/supabase/session-client";

import type { StripeBoundary } from "./stripe";

/**
 * The free trial: a plan state, taken without a card, and ended by the calendar.
 *
 * **It is not a Stripe subscription.** Stripe can run a trial on a subscription, and this
 * is deliberately not that: asking for a card before anybody has seen the product working
 * is the step this trial exists to remove. So a trial here is `plan_id = 'paid'` with
 * `trial_ends_at` set and no `stripe_subscription_id` at all — three facts on the
 * organisation's own row, and nothing in Stripe to reconcile with.
 *
 * That shape is what makes the rest of it simple. Nothing has to be cancelled when a
 * trial ends, because nothing was created; the daily cron moves the plan back and the
 * organisation keeps everything it entered, read-only above the free tier's caps
 * (ADR-0040). And a trial that converts converts by somebody subscribing normally — the
 * webhook clears `trial_ends_at` when a paying subscription lands, which is the whole of
 * the handover.
 *
 * **Once per organisation, and the date is what remembers.** A non-null `trial_ends_at`
 * means the trial has been used, running or long finished, so the date is kept after it
 * lapses rather than cleared. Clearing it would be handing out a second trial on the day
 * the first one ended, and it would do so silently.
 *
 * **How long a trial lasts is Stripe's answer, not this file's.** It is read off the
 * Price's `recurring.trial_period_days` at the moment somebody presses the button — the
 * same rule every commercial term in this product follows: the price, the currency, the
 * dunning schedule and the trial length are configured in Stripe and changed without a
 * deploy. A Price offering no trial is how the business turns the offer off, and it is
 * refused rather than defaulted.
 */

/**
 * How starting a trial can end.
 *
 * `trial_used` and `already_paying` are separate because they are separate sentences to
 * the person reading them: one says this organisation has had its go, the other says it
 * is past needing one. Collapsing them would tell a paying customer they had used
 * something up.
 *
 * `no_trial` is not a fault of the caller's at all — it is the Price saying there is no
 * trial on offer — and it is still in this list because the button was pressed and
 * something has to be said back.
 */
export const trialRefusals = [
  "not_admin",
  "trial_used",
  "already_paying",
  "no_trial",
  "save_failed",
] as const;

export type TrialRefusal = (typeof trialRefusals)[number];

export type StartTrialResult =
  | { ok: true; endsAt: Date }
  | { ok: false; reason: TrialRefusal };

/** Milliseconds in a day. The trial's length arrives in days and is stored as an instant. */
const dayMs = 86_400_000;

/**
 * Start this organisation's free trial.
 *
 * Org Admin-gated, and gated *here* rather than in the page that draws the button,
 * because a server action is a public HTTP endpoint any signed-in member can POST to —
 * `setFxBuffer` makes the same argument for the same reason, and this one moves the whole
 * organisation onto the paid plan.
 *
 * `at` is passed in rather than read from the clock, so the end of the trial is computed
 * from the instant the request boundary resolved (ADR-0010) and a test costs no days.
 * The boundary is passed in for the same reason every outbound boundary in this project
 * is: the Price is read through it, and nothing stubs `fetch`.
 *
 * The read below is the caller's **own** organisation, named from the session rather than
 * from anything the request carried, and the write is filtered on the same id — the
 * service client bypasses RLS, so the boundary a session client would have stated is
 * written out by hand, as every service-client write in this repo does.
 *
 * A deployment with no `STRIPE_PRICE_ID` is refused as `no_trial` rather than thrown at:
 * there is no trial on offer without a Price to read one off, which is the same sentence
 * a Price with no trial produces, and the missing variable is found where every other
 * one is — in the environment, not on an Administrator's screen.
 */
export async function startTrial(
  at: Date,
  store: SessionCookieStore,
  boundary: StripeBoundary,
): Promise<StartTrialResult> {
  const caller = await currentUser(store);

  if (!caller?.isOrgAdmin) return { ok: false, reason: "not_admin" };

  const service = createServiceClient();

  const { data: org } = await service
    .from("orgs")
    .select("trial_ends_at, stripe_subscription_id")
    .eq("id", caller.orgId)
    .maybeSingle();

  // A row that could not be read is not an organisation that has never trialled. It fails
  // in the direction that grants nothing.
  if (!org) return { ok: false, reason: "save_failed" };

  // Before `trial_used`, because a customer who has ever subscribed has a null
  // `trial_ends_at` — the webhook clears it on conversion — and the true sentence for
  // them is the one about paying, not the one about having used something up.
  if (org.stripe_subscription_id !== null) {
    return { ok: false, reason: "already_paying" };
  }

  if (org.trial_ends_at !== null) return { ok: false, reason: "trial_used" };

  // No price configured is no trial on offer — the same answer as a Price with no trial
  // on it, and refused the same way rather than thrown, because this is a button and not
  // a deployment probe: the Administrator reads "no trial", and the deployment's missing
  // variable is found where every other one is, in the environment.
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) return { ok: false, reason: "no_trial" };

  const days = await boundary.retrieveTrialDays(priceId);

  // Null is a Price with no trial configured; zero is one configured to nothing, which
  // means the same and would otherwise produce a trial that had already expired when it
  // was created. Both are the business having turned the offer off, and both are refused
  // rather than filled in with a number this file invented.
  if (days === null || days <= 0) return { ok: false, reason: "no_trial" };

  const endsAt = new Date(at.getTime() + days * dayMs);

  const { error } = await service
    .from("orgs")
    .update({ plan_id: "paid", trial_ends_at: endsAt.toISOString() })
    .eq("id", caller.orgId);

  if (error !== null) return { ok: false, reason: "save_failed" };

  return { ok: true, endsAt };
}

/**
 * Move every organisation whose trial has passed back to the free plan.
 *
 * The daily cron's smallest job, and the only thing that ends a trial — there is no timer
 * in Stripe to fire, because there is no subscription. It runs first in the run and its
 * failure never stops the rates or the group posts: reminders are the product, and a
 * plan left one day long on the paid tier costs nothing anybody can see.
 *
 * **Three conditions, and each one is load-bearing.**
 *
 *   * `plan_id = 'paid'` — so a run does nothing to an organisation already lapsed, and
 *     the count answers how many lapsed *today* rather than how many have ever expired.
 *   * `trial_ends_at <= at` — the instant the run boundary resolved (ADR-0010), never the
 *     clock, so a run pinned to a moment lapses exactly what that moment had passed.
 *   * `stripe_subscription_id is null` — the one that matters. An organisation that
 *     converted still carries its trial date until the webhook clears it, and without
 *     this condition a paying customer would be dropped to the free plan by a cron job on
 *     the morning their old trial date went by.
 *
 * **The date is not cleared**, which is what keeps a trial once per organisation: a
 * non-null date is the record that it has been used.
 *
 * Never throws, and `lapsed: null` is "could not be read" rather than "nothing expired" —
 * the cron reports the difference rather than reporting a quiet zero for a database that
 * did not answer.
 */
export async function lapseExpiredTrials(at: Date): Promise<{ lapsed: number | null }> {
  try {
    const { data, error } = await createServiceClient()
      .from("orgs")
      .update({ plan_id: "free" })
      .eq("plan_id", "paid")
      .lte("trial_ends_at", at.toISOString())
      .is("stripe_subscription_id", null)
      .select("id");

    return error === null ? { lapsed: data.length } : { lapsed: null };
  } catch {
    return { lapsed: null };
  }
}
