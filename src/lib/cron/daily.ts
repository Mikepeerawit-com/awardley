import "server-only";

import { lapseExpiredTrials } from "@/lib/billing/trial";
import type { EmailBoundary } from "@/lib/email/send";
import { fetchDailyRates, type DailyRateFetch, type FxBoundary } from "@/lib/fx/rates";
import type { RobotBoundary } from "@/lib/wecom/robot";

import { sendDailyPosts, type DailyPostReport } from "@/lib/reminders/send";

/**
 * The one scheduled job in v1, and everything it does — which is why it sits here rather
 * than under `@/lib/reminders`: it fetches rates as well as sending them, and the daily
 * Digest joins it.
 *
 * A function rather than the body of the route handler, because the two things it does are
 * the outbound boundaries this project stubs (see the note in `vitest.config.mts`) and
 * a route handler has nowhere to take them as arguments. The route resolves the instant,
 * checks it is really Vercel Cron calling, and hands off to here.
 */

/** All three stubbed boundaries the run stands at, injected together. */
export type CronBoundary = {
  rates?: FxBoundary;
  robot?: RobotBoundary;
  email?: EmailBoundary;
};

export type DailyCronReport = {
  ranAt: string;
  /**
   * How many free trials ended today (#180) — `lapsed: null` when the write could not be
   * made at all, which is a different thing from nothing having expired.
   */
  trials: { lapsed: number | null };
  /** Null when Frankfurter could not be reached — the rates are simply a day older. */
  rates: DailyRateFetch | null;
  posts: DailyPostReport;
};

/**
 * **Trials first, rates second, the group posts last, and none of the first two may stop
 * the third.**
 *
 * The ordering is a ranking of what each failure costs. A trial left one day long on the
 * paid plan costs nothing anybody can see, and it is first only because it is the
 * cheapest and shortest — a single `update`, with no network in it. Every Quote freezes
 * its own rate at entry and no screen re-reads `fx_rates`, so stale rates cost a fallback
 * that is a day older. Reminders that did not go out cost the thing the product exists to
 * prevent. Ordering these the other way round, or letting any of the first two throw,
 * trades the cheap failure for the expensive one — which is why `lapseExpiredTrials`
 * reports a failure rather than raising one.
 *
 * Trials are also the one job here with no outbound boundary to inject: there is nothing
 * in Stripe to cancel, because a card-less trial never created anything there.
 */
export async function runDailyCron(
  at: Date,
  boundary: CronBoundary = {},
): Promise<DailyCronReport> {
  const trials = await lapseExpiredTrials(at);
  const rates = await fetchDailyRates(boundary.rates);
  const posts = await sendDailyPosts(at, {
    robot: boundary.robot,
    email: boundary.email,
  });

  return { ranAt: at.toISOString(), trials, rates, posts };
}
