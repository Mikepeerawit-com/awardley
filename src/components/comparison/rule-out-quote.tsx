"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import {
  reopenQuoteAction,
  ruleOutQuoteAction,
  type QuoteFormState,
} from "@/app/actions/quotes";
import { QuoteProblemNotice } from "@/components/quotes/quote-problem";
import { Button } from "@/components/ui/button";

const initialState: QuoteFormState = {};

/**
 * The two halves of ADR-0032's act, on the two shapes one Quote takes.
 *
 * **The Owner is not comparing two offers; they are eliminating offers one at a time.**
 * `RuleOutQuoteButton` is that elimination, on the card. `ReopenQuoteButton` is the stub it
 * leaves behind — and it is the whole of the undo, which is why there is no separate control
 * for taking a judgement back. The stub *is* the affordance.
 *
 * Both write through `@/app/actions/quotes` rather than the sheet's own boundary: this is a
 * write on a `quotes` row, and reporting a refusal through the same `QuoteProblemNotice`
 * every other Quote form uses is what keeps a new `QuoteProblem` from arriving here as an
 * unexplained button that did nothing.
 */

/**
 * Rule this Quote out, in the card's identity half.
 *
 * ## It asks twice, and only when it costs something
 *
 * A Quote that is its Item's **Selected** Quote loses that selection on the way out — the
 * database's trigger does it, so the two states cannot both be true of a row even for an
 * instant — and losing it is the one decision anybody has made about the Item. So the first
 * press swaps in a sentence naming that and a confirm beside it. This is the shape
 * `QuoteRowControls` already uses for the same cost on the same table, down to the
 * `clears_selection` reason.
 *
 * A Quote nobody selected goes on one press. Inventing a confirm where there is no cost is
 * what teaches people to click through the one that has a cost, and it would also land the
 * friction precisely on the behaviour that shortens the sheet — the judgement is made
 * several times per Item, on a screen the Owner is already scrolling.
 *
 * **There is no note field**, though the column, the schema and `ruleOutQuote` all take one.
 * ADR-0032 makes the note optional exactly because a required reason turns a tap into a
 * form; a field sitting open on every card is most of that cost with none of the refusal.
 * Where it goes is not settled, and nothing is lost by leaving it unwritten until it is.
 */
export function RuleOutQuoteButton({
  tenderId,
  quoteId,
  supplierName,
  isSelected,
}: {
  tenderId: string;
  quoteId: string;
  /** Named in the question, so eight cards say which offer is being discarded. */
  supplierName: string;
  /** Whether this Quote is the Item's Selected Quote, and so costs a decision to discard. */
  isSelected: boolean;
}) {
  const t = useTranslations("comparison.quote");
  const [state, formAction, isPending] = useActionState(ruleOutQuoteAction, initialState);
  const [confirming, setConfirming] = useState(false);

  // The card was drawn knowing this Quote is Selected, or the server has just said so about
  // a card drawn before it was. The second is the path that makes this more than a mirror of
  // `isSelected`: without it the refusal would be re-refused on every press, with no way for
  // the Owner to agree to the cost they are being warned about.
  //
  // **A refusal opens the ghost button, never the confirm**, which is the one place this
  // could quietly become more dangerous than the delete it copies. Arming the destructive
  // submit on the server's word would put the Owner one stray press from clearing a
  // selection they have not agreed to lose — and the press that provoked the refusal is
  // already in their muscle memory. They are told what it costs and asked to say so
  // themselves, exactly as `QuoteRowControls` does.
  const refused = state.error === "clears_selection";
  const costsTheSelection = isSelected || refused;

  return (
    <div className="flex flex-col gap-label">
      {costsTheSelection && !confirming ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 w-full"
          aria-label={t("ruleOutQuote", { supplier: supplierName })}
          onClick={() => setConfirming(true)}
        >
          {t("ruleOut")}
        </Button>
      ) : (
        <form action={formAction} className="contents">
          <input type="hidden" name="tenderId" value={tenderId} />
          <input type="hidden" name="quoteId" value={quoteId} />
          {confirming ? (
            <input type="hidden" name="clearingSelection" value="true" />
          ) : null}

          <Button
            type="submit"
            variant={confirming ? "destructive" : "ghost"}
            size="sm"
            className="h-11 w-full"
            disabled={isPending}
            // Named rather than left to the two words on the button, because eight cards
            // carry eight identical `Rule out` buttons and a reader listing the controls on
            // this Item would otherwise hear the same offer eight times.
            //
            // **It moves with the button's own word**, which is the half a fixed label gets
            // wrong: a label overrides the content, so *Rule out* becoming *Ruling out…*
            // under a standing `Rule out {supplier}` is a control that went dim and said
            // nothing (#144). `pending.layout.test.tsx` presses every submit on every screen
            // and is what caught it.
            //
            // **Off entirely while it reads "Rule it out"**, which is the one state where a
            // label would do harm rather than good: a `Rule out {supplier}` over a button
            // saying *Rule it out* is an accessible name the visible words are not part of,
            // and somebody speaking what they see would name a control that is not there.
            // The question beside it is a `role="alert"` and names the supplier already.
            aria-label={
              confirming
                ? undefined
                : isPending
                  ? t("rulingOutQuote", { supplier: supplierName })
                  : t("ruleOutQuote", { supplier: supplierName })
            }
          >
            {isPending ? t("rulingOut") : confirming ? t("ruleOutConfirm") : t("ruleOut")}
          </Button>
        </form>
      )}

      {/* *Keep it* takes back a question, so it is drawn exactly while there is one open —
          a refusal leaves the ghost button rather than the confirm, and a card with nothing
          asked of it has nothing to decline. Not drawn while the write is away either, for
          the reason #144 gives: a disabled button beside a working one is the fade that
          ticket is about. */}
      {confirming && !isPending ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 w-full"
          onClick={() => setConfirming(false)}
        >
          {t("ruleOutCancel")}
        </Button>
      ) : null}

      {/* The question, or — when it was the server that raised it — the answer to why the
          press did nothing. Both say the same sentence about what the discard costs, because
          it is the same cost; only the first of them is a question, so only the first names
          the supplier and puts a confirm under it. */}
      {confirming || refused ? (
        <p role="alert" className="flex flex-col gap-1 text-sm break-words">
          {confirming ? (
            <span className="font-medium">
              {t("ruleOutPrompt", { supplier: supplierName })}
            </span>
          ) : null}
          <span>{t("ruleOutClearsSelection")}</span>
        </p>
      ) : null}

      {/* `clears_selection` is not reported here. It is not a failure to explain but the
          sentence directly above — and the shared wording is the delete screen's, which
          says "deleting it". */}
      <QuoteProblemNotice error={refused ? undefined : state.error} />
    </div>
  );
}

/**
 * A ruled-out Quote, folded to the line it costs instead of the card it did.
 *
 * A card is 232–350px (ADR-0030) and this is one line, and that difference across the four
 * Quotes an Owner discards on a five-Quote Item is the whole of what ADR-0032 buys. The
 * pattern is `ItemDisclosure`'s one level down: fold the thing to a summary line and leave
 * it in the list, rather than hide it behind a "show ruled out" mode that exists nowhere
 * else in the app — ADR-0030's finding is that the Owner reads every Quote, and one they
 * cannot see without a mode change is one they cannot re-check.
 *
 * The supplier name is what the line carries, because it is what the Owner discarded the
 * offer *of*. Pressing anywhere on it puts the Quote back under consideration: one tap, no
 * confirm, because the Quote rejoining the ranking and the sheet getting longer are both
 * visible in the act of asking.
 *
 * A plain `<button>` rather than the `Button` component, and the reason is the failure bar:
 * `Button` is `whitespace-nowrap`, and a supplier name is a string nobody here chose the
 * length of. `GuangzhouImproveMedicalInstrumentsCoLtd` on a line that refuses to wrap takes
 * the page sideways at 390px.
 */
export function ReopenQuoteButton({
  tenderId,
  quoteId,
  supplierName,
}: {
  tenderId: string;
  quoteId: string;
  supplierName: string;
}) {
  const t = useTranslations("comparison.quote");
  const [state, formAction, isPending] = useActionState(reopenQuoteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-label">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="quoteId" value={quoteId} />

      <button
        type="submit"
        disabled={isPending}
        // The line says what the Quote *is*; the name says what pressing it does. Without
        // this it reads "Ruled out, Bangkok Medline Co." — a state, and not an offer to
        // change one. It moves with the press for the reason the control above gives.
        aria-label={
          isPending
            ? t("reopeningQuote", { supplier: supplierName })
            : t("reopen", { supplier: supplierName })
        }
        className="hover:bg-muted focus-visible:ring-ring bg-card/60 border-hairline-soft flex min-h-11 w-full min-w-0 items-center gap-2 rounded-control border px-2 py-1.5 text-left break-words focus-visible:ring-3 focus-visible:outline-none disabled:opacity-50"
      >
        <span className="field-label bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5">
          {isPending ? t("reopening") : t("ruledOut")}
        </span>
        <span className="text-muted-foreground min-w-0 text-sm break-words">
          {supplierName}
        </span>
      </button>

      <QuoteProblemNotice error={state.error} />
    </form>
  );
}
