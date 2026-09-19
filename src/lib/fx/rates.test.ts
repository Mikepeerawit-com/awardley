import { afterAll, describe, expect, it } from "vitest";

import { convertibleCurrencies } from "@/lib/fx/currencies";
import { failingRates, respondingLatestRates, unreachableRates } from "@/lib/fx/rate-stub";
import { fetchDailyRates } from "@/lib/fx/rates";
import { createServiceClient } from "@/lib/supabase/service-client";

/**
 * The daily rate fetch — the first thing the cron does, and the one part of the night's
 * work that is allowed to come to nothing.
 *
 * Every Quote freezes its own rate at entry, so nothing on any screen depends on this
 * table being fresh. What it is for is the fallback: a Quote entered while Frankfurter is
 * down converts at the last rate this app ever stored, and this is what makes sure there
 * is one.
 *
 * Since #176 what is stored is the **euro leg**, not a pair. ECB publishes against the
 * euro and every pair is a division of two of these rows, so one day's fetch answers every
 * Reporting Currency an org might have rather than the one the app was built around.
 */

const service = createServiceClient();

/** A day nothing else in the suite writes, so these rows are this file's alone. */
const asOf = "2015-03-17";

/** Per euro, as ECB publishes. */
const perEur = { THB: 40, USD: 1.25, CNY: 8, JPY: 160 };

afterAll(async () => {
  await service.from("fx_rates").delete().eq("as_of", asOf);
});

async function storedRate(currency: string): Promise<number | null> {
  const { data } = await service
    .from("fx_rates")
    .select("rate_per_eur")
    .eq("currency", currency)
    .eq("as_of", asOf)
    .maybeSingle();

  return data ? Number(data.rate_per_eur) : null;
}

describe("the daily rate fetch", () => {
  it("stores every convertible currency the response carried, from one request", async () => {
    const boundary = respondingLatestRates(perEur, asOf);

    const result = await fetchDailyRates(boundary);

    expect(boundary.asked).toHaveLength(1);
    // THB, USD, CNY and JPY from the table, plus the euro it is expressed in.
    expect(result).toEqual({ asOf, stored: 5 });
  });

  it("stores the euro legs untouched rather than collapsing them to a pair", async () => {
    await fetchDailyRates(respondingLatestRates(perEur, asOf));

    // `rate_to_thb` used to hold 32 here — 40 Baht per euro over 1.25 Dollars per euro.
    // The division is the reader's now, which is what lets the same row answer THB→USD.
    await expect(storedRate("USD")).resolves.toBe(1.25);
    await expect(storedRate("CNY")).resolves.toBe(8);
  });

  it("stores the Reporting Currency's own leg, which the old column had no room for", async () => {
    // The filter this replaces dropped it on the grounds that one Baht is one Baht.
    // Converting *into* a currency needs its euro leg, so that row is the one the table
    // cannot do without.
    await fetchDailyRates(respondingLatestRates(perEur, asOf));

    await expect(storedRate("THB")).resolves.toBe(40);
  });

  it("writes the euro's own leg in, because ECB never publishes it", async () => {
    // A base does not appear among the rates it is the base of, and a Quote in euros is
    // still a Quote somebody has to convert.
    await fetchDailyRates(respondingLatestRates(perEur, asOf));

    await expect(storedRate("EUR")).resolves.toBe(1);
  });

  it("skips a currency the response did not carry rather than storing nothing", async () => {
    // ECB adds and drops currencies about once a decade. One missing symbol must not
    // take the other twenty-eight down with it.
    await fetchDailyRates(respondingLatestRates(perEur, asOf));

    await expect(storedRate("JPY")).resolves.toBe(160);
    await expect(storedRate("ISK")).resolves.toBeNull();
  });

  it("stores nothing for a currency ECB does not publish at all", async () => {
    // The response's own symbols are not the list: `fx_rates` holds the convertible set,
    // and a symbol outside it is one no Quote could have been entered in.
    await fetchDailyRates(respondingLatestRates({ ...perEur, VND: 27_000 }, asOf));

    await expect(storedRate("VND")).resolves.toBeNull();
    expect(convertibleCurrencies).not.toContain("VND");
  });

  it("dates the rows the day ECB published, not the day it was asked", async () => {
    // A Sunday run is keeping Friday's rates, and `fx_rate_as_of` on a Quote is what
    // later tells a reader the figure is not today's.
    const result = await fetchDailyRates(respondingLatestRates(perEur, asOf));

    expect(result?.asOf).toBe(asOf);
  });

  it("reports nothing rather than throwing when Frankfurter is unreachable", async () => {
    await expect(fetchDailyRates(unreachableRates())).resolves.toBeNull();
  });

  it("reports nothing rather than throwing when Frankfurter answers with an error", async () => {
    await expect(fetchDailyRates(failingRates())).resolves.toBeNull();
  });

  it("reports nothing when the response carries no rates at all", async () => {
    // The euro's leg is written in unconditionally, so a body that is not a rate table
    // would otherwise store one row and report success on a night that fetched nothing.
    await expect(
      fetchDailyRates(respondingLatestRates({}, asOf)),
    ).resolves.toBeNull();
  });
});
