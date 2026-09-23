import "server-only";

import { convertibleCurrencies, isConvertibleCurrency } from "@/lib/fx/currencies";
import { createServiceClient } from "@/lib/supabase/service-client";
import type { createSessionClient } from "@/lib/supabase/session-client";

/**
 * The rate a Quote freezes at entry.
 *
 * A Quote stores `fx_rate_mid`, `fx_rate_applied` and `fx_rate_as_of` and never asks
 * again. History stays auditable, dashboard totals do not drift, and no screen depends
 * on a rate service being up at render time — the ranking a person saw is reproducible
 * from the stored row a year later.
 *
 * Rates come from Frankfurter: MIT, no key, no quota, free for commercial use, and
 * self-hostable if it disappears. What it serves is **ECB reference rates — mid-market,
 * business days only** — so a Quote entered on a Saturday freezes Friday's rate, and the
 * response says so in its own `date` rather than this file assuming anything.
 *
 * ## The euro is the pivot, and every pair is a division
 *
 * Since #176 there is no single currency to convert *to*: the target is the Tender's
 * Reporting Currency (ADR-0036) and a second organisation may report in something else.
 * So nothing here asks Frankfurter for a pair. It asks for the day's euro table — which
 * is what ECB actually publishes and what Frankfurter serves when no `base` is given —
 * and computes `per_eur[reporting] / per_eur[currency]`. One request answers every pair,
 * `fx_rates` stores one row per currency per day rather than one per pair, and adding a
 * customer who reports in SGD costs no extra rows and no extra requests.
 *
 * ## Nothing here may stop a Quote being recorded
 *
 * An Assignee is off the phone with a supplier holding a price. Whether a rate service
 * in Frankfurt answered in the next two seconds is not their problem, so every failure
 * path here ends in a usable rate marked `isStale` rather than in a refusal. The one
 * exception is a currency with no rate at all, ever — see {@link freezeRate}.
 */

/**
 * The outbound boundary, injected so tests can stand at it — one of exactly four stubbed
 * in this project (see the note in vitest.config.mts). Not a global `fetch` stub: this
 * runs inside a server action that also talks to Postgres over HTTP, and taking `fetch`
 * out globally would take `supabase-js` with it.
 */
export type FxBoundary = { fetch?: typeof globalThis.fetch };

/** What a Quote freezes. Both rates, so the buffer stays visible and is applied once. */
export type FrozenRate = {
  /** ECB mid-market, as published. */
  mid: number;
  /** `mid * (1 + fx_buffer_pct)` — what the Quote is actually converted at. */
  applied: number;
  /** The ECB reference date the rate belongs to, which is rarely today. */
  asOf: string;
  /** True when Frankfurter could not be reached and a previously stored rate was used. */
  isStale: boolean;
};

const frankfurter = "https://api.frankfurter.dev/v1";

/**
 * How long to wait for a rate before giving up and using the last known one.
 *
 * "Never block quote entry" is a promise about wall-clock time as much as about
 * outcomes: a fetch with no deadline does not fail, it hangs, and a form that hangs on a
 * phone inside the WeCom webview is indistinguishable from an app that has crashed.
 */
const timeoutMs = 4_000;

/** `numeric(18,8)`, and the precision both rates are rounded to before they are stored. */
const rateScale = 1e8;

/**
 * Freeze a rate for one Quote, or report that there is none.
 *
 * `reporting` is the **Tender's** Reporting Currency, not the organisation's current
 * setting: a Tender is stamped with it as it opens and keeps it for life (ADR-0036), so a
 * Quote entered today onto a Tender opened last quarter converts into the currency that
 * Tender's other Quotes were ranked in. Passed in rather than read here for that reason —
 * this module cannot tell the two apart, and the caller holding the Tender can.
 *
 * Returns null only when the currency is one ECB does not publish, or when Frankfurter
 * could not be reached *and* nothing has ever been stored that can price this pair. The
 * second is the honest floor: `fx_rate_mid` is `not null` and every total in the app is
 * built on it, so the alternative to refusing is a stored price nothing can convert —
 * which A11 rejected for the first case and which is no better for the second. It cannot
 * happen for a pair that has been quoted once before.
 *
 * A Quote already in the Tender's own currency never touches the network. Both rates are
 * 1 and `asOf` is the quoted date itself: it is not converted, so there is no rate to be
 * stale about.
 */
export async function freezeRate(
  {
    currency,
    reporting,
    on,
    bufferPct,
  }: { currency: string; reporting: string; on: string; bufferPct: number },
  supabase: ReturnType<typeof createSessionClient>,
  boundary: FxBoundary = {},
): Promise<FrozenRate | null> {
  if (currency === reporting) {
    return { mid: 1, applied: 1, asOf: on, isStale: false };
  }

  if (!isConvertibleCurrency(currency)) return null;

  const fetched = await fetchRate(currency, reporting, on, boundary);

  if (fetched !== null) {
    // Best effort, and deliberately not awaited for its outcome beyond errors being
    // ignored: the Quote is what the user asked for, and a rate that failed to cache is
    // one more fetch next time rather than a failure to report. The daily cron (#33)
    // fills this table properly; writing here as well is what gives the fallback below
    // something to find before that cron exists.
    await remember(fetched.asOf, fetched.perEur);

    return withBuffer(fetched.rate, fetched.asOf, bufferPct, false);
  }

  const known = await lastKnown(currency, reporting, supabase);

  return known === null ? null : withBuffer(known.rate, known.asOf, bufferPct, true);
}

/**
 * What the daily fetch managed. Null when Frankfurter could not be reached at all.
 *
 * A null is not a failure the cron reports upwards. The whole point of freezing a rate on
 * the Quote is that no later screen depends on this table being fresh, so a rate service
 * that is down leaves yesterday's rates in place and the run goes on to send the
 * reminders — which is the half of the night's work that people actually notice missing.
 */
export type DailyRateFetch = { asOf: string; stored: number };

/**
 * Keep every convertible currency's euro leg for the day. Run once a day by the cron,
 * before anything is sent.
 *
 * **One request, and now no arithmetic either.** ECB publishes everything against the
 * euro, so the response is already the shape `fx_rates` stores. It used to be divided down
 * to a single `rate_to_thb` column on the way in, which answered exactly one question;
 * storing the euro legs untouched answers every pair from the same fetch.
 *
 * **Every convertible currency gets a row, the Reporting Currency included.** The old code
 * filtered it out on the grounds that a row saying one Baht is one Baht would be read by
 * nothing. That is no longer true and is the point of the change: converting *into* a
 * currency needs its euro leg, so the currency an org reports in is the one row the table
 * cannot do without. EUR gets one too — see {@link eurTable} for why it has to be written
 * in rather than read out.
 *
 * The response carries its own `date` and that is what is stored: ECB publishes on
 * business days, so a Sunday run is keeping Friday's rates and must say so rather than
 * dating them today. `ignoreDuplicates` for the same reason {@link freezeRate} uses it —
 * a published reference rate is not revised, so a row that is already there is already
 * right, and the Quote that fetched it first is entitled to have won.
 */
export async function fetchDailyRates(
  boundary: FxBoundary = {},
): Promise<DailyRateFetch | null> {
  const get = boundary.fetch ?? globalThis.fetch;

  let body: { date?: unknown; rates?: Record<string, unknown> };

  try {
    const response = await get(`${frankfurter}/latest`, {
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return null;

    body = (await response.json()) as { date?: unknown; rates?: Record<string, unknown> };
  } catch {
    return null;
  }

  const asOf = body.date;

  if (typeof asOf !== "string") return null;

  const rows = rowsFor(asOf, eurTable(body.rates));

  // A response carrying nothing this app can convert with. `eurTable` always writes the
  // euro's own leg, so reaching zero rows means the body was not a rate table at all.
  if (rows.length <= 1) return null;

  const { error } = await createServiceClient()
    .from("fx_rates")
    .upsert(rows, { onConflict: "currency,as_of", ignoreDuplicates: true });

  return error === null ? { asOf, stored: rows.length } : null;
}

/** One day's euro table, and the one pair out of it that a Quote asked for. */
type FetchedRate = {
  rate: number;
  asOf: string;
  /** Units of each currency per one euro, exactly as ECB published them. */
  perEur: Record<string, number>;
};

/**
 * Ask Frankfurter for the day's euro table, and divide the pair out of it.
 *
 * No `base` parameter, which is the whole of the change #176 made here. Frankfurter's own
 * base is the euro, so the bare `/{date}` is the table ECB published, and the pair is
 * `per_eur[reporting] / per_eur[currency]`. Asking for the pair directly would have been
 * one currency's answer to a question that now has a different answer per organisation,
 * and would leave {@link remember} with one row to cache instead of thirty.
 *
 * The date goes in the path and the answer carries its own `date` back, because the two
 * are routinely different: ECB publishes on business days, so asking for a Saturday
 * returns Friday. Whatever comes back is what the Quote freezes and what the comparison
 * view will later show on hover — never the date that was asked for.
 *
 * Every failure is null. There is nothing a caller could do differently for a timeout
 * than for a 500 or for a body in a shape this does not recognise, and all three mean
 * the same thing to the person holding the price.
 */
async function fetchRate(
  currency: string,
  reporting: string,
  on: string,
  boundary: FxBoundary,
): Promise<FetchedRate | null> {
  const get = boundary.fetch ?? globalThis.fetch;

  try {
    const response = await get(`${frankfurter}/${on}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      date?: unknown;
      rates?: Record<string, unknown>;
    };
    const asOf = body.date;

    if (typeof asOf !== "string") return null;

    const perEur = eurTable(body.rates);
    const from = perEur[currency];
    const to = perEur[reporting];

    // A pair one end of which ECB did not publish that day. Null rather than a partial
    // answer: half a cross-rate is not a rate, and the fallback below may still have both.
    if (from === undefined || to === undefined) return null;

    return { rate: to / from, asOf, perEur };
  } catch {
    return null;
  }
}

/**
 * The published table as this module uses it: every leg ECB printed, plus the euro's own.
 *
 * **EUR is absent from its own table** — a base does not appear among the rates it is the
 * base of — and a euro Quote is still a Quote somebody has to convert, as is a Quote
 * converted *into* euros by an org reporting in them. Writing the missing 1 in here rather
 * than special-casing it at each of the three places that read a euro leg is what keeps
 * `perEur[currency]` a question with one answer.
 *
 * Anything that is not a positive finite number is dropped rather than coerced. ECB adds
 * and drops currencies about once a decade, and one symbol arriving as null must not take
 * the other twenty-nine down with it.
 */
function eurTable(rates: Record<string, unknown> | undefined): Record<string, number> {
  const table: Record<string, number> = {};

  for (const [currency, rate] of Object.entries(rates ?? {})) {
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      table[currency] = rate;
    }
  }

  // Last, so a response that did carry a euro leg cannot make it anything but 1.
  table.EUR = 1;

  return table;
}

/** The euro table as `fx_rates` stores it: one row per convertible currency per day. */
function rowsFor(
  asOf: string,
  perEur: Record<string, number>,
): { currency: string; as_of: string; rate_per_eur: number }[] {
  return convertibleCurrencies
    .filter((currency) => perEur[currency] !== undefined)
    .map((currency) => ({
      currency,
      as_of: asOf,
      rate_per_eur: round(perEur[currency]),
    }));
}

/**
 * Keep what was fetched, so the next Quote has something to fall back to.
 *
 * **The whole table, not the one pair that was asked for.** The fetch already paid for
 * every currency's euro leg, and {@link lastKnown} needs both ends of a pair from one day
 * to answer at all — so one Quote in Yuan warms the fallback for the twenty-eight
 * currencies nobody has quoted yet, on a Tender in any Reporting Currency.
 *
 * Written with the service client because `fx_rates` is reference data with no owner and
 * its policy is read-only: the browser's anon key must never hold an edit on the rate
 * every future Quote freezes at. `ignoreDuplicates` because the same day's rate is
 * fetched by every Quote entered that day and re-writing it would be a needless
 * round trip, not a correction — ECB does not revise a published reference rate.
 */
async function remember(
  asOf: string,
  perEur: Record<string, number>,
): Promise<void> {
  await createServiceClient()
    .from("fx_rates")
    .upsert(rowsFor(asOf, perEur), {
      onConflict: "currency,as_of",
      ignoreDuplicates: true,
    });
}

/**
 * The most recent day this app holds a euro leg for **both** currencies, and the pair that
 * day makes.
 *
 * **Both legs come from one `as_of`, and that is the whole reason this is not two
 * queries.** Taking the newest Yuan leg and the newest Baht leg independently would
 * silently stitch a cross-rate out of two different publication days — Thursday's Yuan
 * over Tuesday's Baht — and that is not a rate anybody published. It is two days of drift
 * on both legs folded into one number, which then gets frozen onto a Quote and ranked
 * against Quotes frozen properly, with nothing on the row to say the two halves disagreed
 * about what day it was. The older day both legs actually agree on is the honest answer,
 * and `fx_rate_as_of` is where it is recorded.
 *
 * Read through the caller's own session, because `fx_rates` is readable by any member of
 * any org and by nobody else — the same answer the browser would get. Deliberately *not*
 * bounded to on-or-before the quoted date: the fallback exists because a service is
 * unreachable, and the nearest rate there is beats no Quote at all. `fx_rate_as_of`
 * records which day it really came from, and `fx_rate_is_stale` says out loud that it is
 * not the day that was asked for.
 *
 * Unbounded in rows for the same reason it is unbounded in dates: how far back the last
 * day holding both legs is, is exactly what this cannot know before it looks, and the
 * table holds two currencies' worth of business days.
 */
async function lastKnown(
  currency: string,
  reporting: string,
  supabase: ReturnType<typeof createSessionClient>,
): Promise<{ rate: number; asOf: string } | null> {
  const { data } = await supabase
    .from("fx_rates")
    .select("as_of, currency, rate_per_eur")
    .in("currency", [currency, reporting])
    .order("as_of", { ascending: false })
    .overrideTypes<StoredRate[], { merge: false }>();

  const byDate = new Map<string, Map<string, number>>();

  for (const row of data ?? []) {
    const legs = byDate.get(row.as_of) ?? new Map<string, number>();

    // `numeric` crosses the wire as a JSON number in a type wider than this column holds.
    legs.set(row.currency, Number(row.rate_per_eur));
    byDate.set(row.as_of, legs);
  }

  // Newest first, because that is the order the rows arrived in and a `Map` keeps it.
  for (const [asOf, legs] of byDate) {
    const from = legs.get(currency);
    const to = legs.get(reporting);

    if (from !== undefined && to !== undefined) return { rate: to / from, asOf };
  }

  return null;
}

/** One stored euro leg, as {@link lastKnown} reads it back. */
type StoredRate = { as_of: string; currency: string; rate_per_eur: number };

/**
 * Apply the org's buffer, once.
 *
 * ECB mid-market is not what a bank charges, so the stored conversion errs toward
 * *overstating* cost: a Bid built on an understated cost is a Bid that wins and loses
 * money. Both rates are kept precisely so the buffer stays visible in the row and cannot
 * be applied a second time by anything downstream.
 *
 * Both are rounded to the column's own scale here rather than left to Postgres, so what
 * a test asserts and what a comparison view later re-derives are the same number.
 */
function withBuffer(
  mid: number,
  asOf: string,
  bufferPct: number,
  isStale: boolean,
): FrozenRate {
  return {
    mid: round(mid),
    applied: round(mid * (1 + bufferPct)),
    asOf,
    isStale,
  };
}

function round(rate: number): number {
  return Math.round(rate * rateScale) / rateScale;
}
