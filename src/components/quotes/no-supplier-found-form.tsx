"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  clearNoSupplierFoundAction,
  recordNoSupplierFoundAction,
  type QuoteFormState,
} from "@/app/actions/quotes";
import { QuoteProblemNotice } from "@/components/quotes/quote-problem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NoSupplierFound } from "@/lib/quotes/quotes";

const initialState: QuoteFormState = {};

/**
 * "I could not source this."
 *
 * A third state, and the whole reason it exists is that it is *not* silence. An Item
 * nobody has touched and an Item somebody has already given up on mean opposite things
 * when deciding whether to Bid at all — and only one of them is worth chasing an Assignee
 * about. Recording it is also how an Assignee stops the app asking them for work that
 * cannot be done.
 *
 * It is per-Assignee, never per-Item, and the screen says so. Assignees compete rather
 * than divide (ADR-0004): one of them failing to find a supplier is a fact about their
 * suppliers, not a verdict on the Item, and a colleague may well be holding a price for
 * the same thing.
 *
 * **The pending words stay in the voice the buttons are written in** (#144). `CONTEXT.md`
 * says this control is stated as something the Assignee did rather than a status they set
 * — *I could not source this* / *I found one after all* — so the beat between the press
 * and the write is *Recording it…* and *Taking it back…*, which are still that act in
 * progress. A bare *Saving…* would answer a sentence about a person in the voice of a
 * form, at the one moment the person is watching to see whether they were heard.
 */
export function NoSupplierFoundForm({
  tenderId,
  tenderItemId,
  mine,
  others,
  reportingCurrency,
}: {
  tenderId: string;
  tenderItemId: string;
  /** The caller's own record, if they have left one. */
  mine: NoSupplierFound | null;
  /** Everybody else's, shown as fact rather than as something to act on. */
  others: NoSupplierFound[];
  /** Carried only so the shared refusal notice can name it — see `QuoteProblemNotice`. */
  reportingCurrency: string;
}) {
  const t = useTranslations("quotes.noSupplier");

  return (
    <div className="flex flex-col gap-field">
      <div className="flex flex-col gap-label">
        <h3 className="type-subhead">{t("title")}</h3>
        <p className="type-quiet">{t("hint")}</p>
      </div>

      {others.length > 0 ? (
        <ul className="type-quiet flex flex-col gap-1">
          {others.map((other) => (
            <li key={other.userId}>
              {other.note
                ? t("byWithNote", { name: other.name, note: other.note })
                : t("by", { name: other.name })}
            </li>
          ))}
        </ul>
      ) : null}

      {mine ? (
        <ClearForm
          tenderId={tenderId}
          tenderItemId={tenderItemId}
          mine={mine}
          reportingCurrency={reportingCurrency}
        />
      ) : (
        <RecordForm
          tenderId={tenderId}
          tenderItemId={tenderItemId}
          reportingCurrency={reportingCurrency}
        />
      )}
    </div>
  );
}

function RecordForm({
  tenderId,
  tenderItemId,
  reportingCurrency,
}: {
  tenderId: string;
  tenderItemId: string;
  reportingCurrency: string;
}) {
  const t = useTranslations("quotes.noSupplier");
  const [state, formAction, isPending] = useActionState(
    recordNoSupplierFoundAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-field">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="tenderItemId" value={tenderItemId} />

      <QuoteProblemNotice error={state.error} reportingCurrency={reportingCurrency} />

      <div className="flex flex-col gap-label">
        <Label htmlFor={`nsf-note-${tenderItemId}`}>{t("note")}</Label>
        <Input
          id={`nsf-note-${tenderItemId}`}
          name="note"
          placeholder={t("notePlaceholder")}
          className="h-11"
        />
      </div>

      <div>
        <Button type="submit" variant="outline" disabled={isPending} className="h-11">
          {isPending ? t("recording") : t("record")}
        </Button>
      </div>
    </form>
  );
}

/**
 * Taking it back, which happens: a supplier rings back, or somebody thinks of one more to
 * try. Entering a Quote clears it too, on the server — an Assignee who has just sourced
 * the Item is no longer somebody who could not.
 */
function ClearForm({
  tenderId,
  tenderItemId,
  mine,
  reportingCurrency,
}: {
  tenderId: string;
  tenderItemId: string;
  mine: NoSupplierFound;
  reportingCurrency: string;
}) {
  const t = useTranslations("quotes.noSupplier");
  const [state, formAction, isPending] = useActionState(
    clearNoSupplierFoundAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-field">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="tenderItemId" value={tenderItemId} />

      <p className="text-sm">{mine.note ? t("mineWithNote", { note: mine.note }) : t("mine")}</p>

      <QuoteProblemNotice error={state.error} reportingCurrency={reportingCurrency} />

      <div>
        <Button type="submit" variant="ghost" disabled={isPending} className="h-11">
          {isPending ? t("clearing") : t("clear")}
        </Button>
      </div>
    </form>
  );
}
