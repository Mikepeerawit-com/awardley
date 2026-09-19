import type { FxBoundary } from "./rates";

/**
 * The test double for the Frankfurter boundary — test-only, imported by no shipping
 * code.
 *
 * One stub rather than one per test file, for the reason `robot-stub.ts` is one: two
 * hand-rolled fakes drift, and the one that drifts is the one still passing. It records
 * what was asked for as well as answering, because *which day* was requested is half of
 * what this boundary is: a Quote dated on a Saturday must ask for the Saturday and let
 * ECB answer with the Friday, not quietly ask for something else.
 */

export type RateStub = FxBoundary & {
  /** Every URL asked for, in order. */
  asked: string[];
};

/**
 * A Frankfurter that prices one pair at `rate`.
 *
 * Since #176 the boundary asks for the day's **euro table** rather than a pair, so this
 * has to name both legs of the pair it is standing in for: it holds `quoted` at one euro
 * and puts `reporting` at `rate`, which divides back to exactly `rate` however the code
 * under test gets there. A caller who only cares that a rate exists keeps saying
 * `respondingRates(1)` and never meets either name.
 *
 * **Only the legs under test are in the table**, and that is not tidiness. `freezeRate`
 * caches every row it is given, so a stub that invented the other twenty-seven currencies
 * would leave them in `fx_rates` — which has no org, is shared by every suite, and is
 * exactly where the next suite looks for its fallback.
 *
 * `asOf` defaults to the date that was asked for; pass a different one to stand in for
 * the business-day rule, where a Saturday's request comes back dated Friday.
 */
export function respondingRates(
  rate: number,
  asOf?: string,
  quoted = "CNY",
  reporting = "THB",
): RateStub {
  const asked: string[] = [];

  const fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));

    asked.push(url.toString());

    return Response.json({
      amount: 1,
      base: "EUR",
      // The path is `/v1/{date}`, which is what "the day that was asked for" means here.
      date: asOf ?? url.pathname.split("/").pop(),
      rates: { [quoted]: 1, [reporting]: rate },
    });
  };

  return { asked, fetch: fetch as typeof globalThis.fetch };
}

/**
 * A Frankfurter serving the euro table the daily fetch asks for.
 *
 * Rates are **per euro**, the way ECB publishes and the way `/latest` answers, which since
 * #176 is also the way they are stored — so a test states what it means and nothing is
 * divided on the way in. The euro's own leg is deliberately absent, because a base does not
 * appear among the rates it is the base of and the code has to write it in.
 */
export function respondingLatestRates(
  perEur: Record<string, number>,
  asOf = "2026-08-07",
): RateStub {
  const asked: string[] = [];

  const fetch = async (input: RequestInfo | URL) => {
    asked.push(String(input));

    return Response.json({ amount: 1, base: "EUR", date: asOf, rates: perEur });
  };

  return { asked, fetch: fetch as typeof globalThis.fetch };
}

/** A Frankfurter that cannot be reached at all — the transport itself fails. */
export function unreachableRates(message = "ECONNRESET"): FxBoundary {
  return {
    fetch: (() => Promise.reject(new Error(message))) as typeof globalThis.fetch,
  };
}

/** A Frankfurter that is up and answering with an error status. */
export function failingRates(status = 503): FxBoundary {
  return {
    fetch: (async () =>
      new Response("upstream said no", { status })) as typeof globalThis.fetch,
  };
}
