/**
 * The currencies a Quote may be entered in.
 *
 * Deliberately not `server-only`: the picker on the add-quote form and the check that
 * refuses a price on the server read the same list, and a picker offering a currency the
 * server will reject is a refusal nobody could have avoided.
 *
 * ## Why the list is written down rather than fetched
 *
 * Frankfurter serves it at `/v1/currencies`, and asking for it would make rendering the
 * form depend on a service being up — which is exactly the dependency the frozen rate
 * exists to remove. It is also the ECB reference list, which changes about once a
 * decade: the last additions were 2018. A currency ECB starts publishing shows up here
 * in a one-line commit, and until then a supplier quoting it is refused at entry with a
 * sentence, rather than stored as a price nothing can convert (buildspec_2.md A11).
 *
 * Verified against `https://api.frankfurter.dev/v1/currencies` on 2026-08-21.
 */

/**
 * The thirty currencies ECB publishes a reference rate for.
 *
 * It is also the list a **Reporting Currency** may be chosen from (ADR-0036), and for a
 * harder reason than the picker's: an organisation reporting in something ECB does not
 * publish could not convert a single foreign Quote into it. Converting *into* a currency
 * needs its euro leg exactly as converting out of one does, so the two lists are one list
 * and there is nothing to keep in step.
 */
export const convertibleCurrencies = [
  "AUD", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD",
  "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK",
  "NZD", "PHP", "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR",
] as const;

const convertible = new Set<string>(convertibleCurrencies);

export function isConvertibleCurrency(currency: string): boolean {
  return convertible.has(currency);
}

/**
 * The order the picker offers them in: the org's own Reporting Currency first, then the
 * two others seen in real data, then the rest alphabetically.
 *
 * The Reporting Currency leads because it is the one most Quotes arrive in — it is what
 * the organisation buys and reports in — and a price entered in the wrong one by a
 * mis-tapped default is out by whatever the pair is worth, in the one direction that makes
 * a Bid look cheap. Thirty-three times, when the pair was the Baht and the Dollar this
 * argument was first written about.
 *
 * A function since #176 rather than the constant it was, because there is no longer one
 * Reporting Currency to build the order around: the order is a question about one
 * organisation, and the only caller that can answer it is one holding a Tender.
 *
 * CNY and USD keep their place behind it for the reason they had it in front of the other
 * twenty-seven — they are what Taihue's suppliers actually quote in — and they are dropped
 * from the tail rather than repeated when one of them *is* the Reporting Currency.
 */
export function currencyOptions(reporting: string): string[] {
  const leading = [reporting, "CNY", "USD"].filter(
    (currency, index, all) => all.indexOf(currency) === index,
  );

  return [
    ...leading,
    ...convertibleCurrencies.filter((currency) => !leading.includes(currency)),
  ];
}
