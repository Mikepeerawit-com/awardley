"use client";

import { useTranslations } from "next-intl";

import type { QuoteProblem } from "@/lib/quotes/quotes";

/**
 * Whatever the server refused, said in the reader's language.
 *
 * Every form on the sourcing screen reports through this one component, so a reason added
 * to `QuoteProblem` shows up as a missing key in both message files rather than as an
 * unexplained failed save — which here means a price that did not get written down.
 *
 * **The Reporting Currency is required rather than optional**, though only `no_rate` says
 * it today — that refusal ends "or enter the price in {currency}", and it is the one
 * sentence standing between somebody and a price they cannot write down. A default would
 * have it name baht on a Tender opened in something else, which is worse than saying
 * nothing: it is advice that would be refused again. Every form below this sits under a
 * Tender and can answer, so the compiler asking costs a prop and buys the guarantee.
 */
export function QuoteProblemNotice({
  error,
  reportingCurrency,
}: {
  error?: QuoteProblem;
  /** The Tender's Reporting Currency, for the refusals that name it (ADR-0036). */
  reportingCurrency: string;
}) {
  const t = useTranslations("quotes.error");

  if (!error) return null;

  return (
    <p
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive rounded-surface border px-3 py-2 text-sm"
    >
      {t(error, { currency: reportingCurrency })}
    </p>
  );
}
