import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { money } from "@/components/specimens";

/**
 * Three traces under the problem rows: the artefacts a reader has today, before Awardley.
 *
 * **They show the failure, not the fix.** The problem section is the one part of the site
 * that describes something other than the product, and the obvious way to illustrate it —
 * a piece of the app with a price in it — would quietly answer the section instead of
 * stating it. So these are not specimens. They are the scraps the reader already owns: two
 * versions of the same amount, a count of Items that does not reach four, an award with the
 * reasoning gone. Each one sits under the sentence it belongs to, and the pair is a title,
 * a line, and the evidence both of them are about — the same grammar the how-it-works
 * columns use, aimed the other way.
 *
 * **The ground is one shade greyer than a specimen, on purpose.** A how-it-works specimen is
 * the page's inset sheet — `background` inside a hairline, the white plate the product draws
 * on. A trace is that frame on `card`, the ground the sheet's own header strip takes, and the
 * difference is the whole argument the two sections make in sequence: the page goes grey in
 * the problem and white in how-it-works, and a reader scrolling past sees the ink come up
 * before they have read a word of either. It is a one-step ground change and a hairline, the
 * page's only way of declaring a layer (DESIGN.md, the Hairline Depth Rule) — not a second
 * palette, not a coloured band, not a shadow.
 *
 * **No accent, no wash, no tick, ever.** Every line in here is `text-muted-foreground`,
 * including the amounts. The accent on this site means the product working — a quote
 * selected, a Bid that follows, a button worth pressing — and an accent on a trace would be
 * the page congratulating itself on the failure it is describing. The tick is the site's
 * entire icon vocabulary and it means *chosen*; nothing here has been chosen by anything.
 *
 * **The absence has a glyph and it is not a translated string.** Where the record has
 * nothing, the trace prints {@link ABSENT} — an em dash, the same character in both builds.
 * A localised *not recorded* would be the page writing prose inside the evidence, and two
 * different-looking blanks would read as two different kinds of missing.
 *
 * **The figures are deliberately not the Quotes sheet's worked example.** The sheet in the
 * panel, the three specimens and the Bid under them are one tender — the gloves Item, 1,780
 * and 1,795 — and it is the tender the product is running. A trace is the reader's *last*
 * tender, the one they ran without any of this, and borrowing the sheet's numbers for it
 * would put the page's single worked example on both sides of its own argument: the same
 * Item both lost and won, the same amount both stale and selected. 2,450 and 2,610 are a
 * different tender because it was a different tender.
 *
 * Nothing here is fixed-height, unlike {@link Specimen}: the three traces sit one per row in
 * a stack rather than side by side in a grid, so there is no row for them to line up across,
 * and a fixed height would only buy a band of empty ground under the shortest of them. No
 * state, no `"use client"`, no animation class and no new CSS — the page has one beat and it
 * belongs to the product panel.
 */

/**
 * The absence marker. Module-level and untranslated: it is the same glyph in `en` and
 * `zh-Hans`, for the same reason `QUANTITY` and `REFERENCE` in `components/specimens.tsx`
 * are — a value that is not words should not be carried by a strings file that can only
 * change it in one locale at a time.
 */
const ABSENT = "—";

/**
 * The frame, and the reason `money` is imported here rather than copied again.
 *
 * `components/specimens.tsx` keeps its own copy of the three grouping lines instead of
 * importing them from `components/quotes-sheet.tsx`, because that module is `"use client"`
 * and every one of its exports crosses into a server component as a client reference rather
 * than as the function itself. Neither this module nor `specimens.tsx` is a client module,
 * so there is no boundary between them: `money` arrives here as the function, `money(2450)`
 * is an ordinary call, and the amounts on a trace are grouped and two-placed by exactly the
 * code that groups the ones on the sheet. One formatter for every amount on the page is the
 * outcome the duplication next door was settling for, not an exception to it.
 */
function Trace({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card [&>*+*]:border-t [&>*+*]:border-border">
      {children}
    </div>
  );
}

/**
 * One line of the artefact: what it is on the left, what it says on the right.
 *
 * Label-left / value-right rather than the stacked {@link Field} grammar the specimens use,
 * because a trace's values are short — a date, a count, a price, a dash — and stacking a
 * two-word label over a two-word value would make three rows of a thing that is not a form.
 * Baseline-aligned so that a 12px label and a 14px amount sit on one line rather than on two
 * centres, and `tabular-nums` on every value so the two amounts of a stale price line up
 * digit under digit; that they line up is how a reader sees at a glance that they differ.
 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm tabular-nums text-muted-foreground">{value}</p>
    </div>
  );
}

/**
 * The price that moved: one Item, two moments, two amounts.
 *
 * Both values are present, which is the one trace where nothing is missing — the failure is
 * not an absence here, it is a disagreement, and a disagreement needs both halves on screen
 * to be one. The days are named (Monday, Tuesday) rather than dated, because the sentence
 * above says the sheet was saved on Monday and the supplier revised on Tuesday, and a trace
 * that quietly used a different pair of days would be evidence for a different claim.
 */
export function StaleTrace() {
  const t = useTranslations("trace");

  return (
    <Trace>
      <Row label={t("stale.inBid")} value={money(2450)} />
      <Row label={t("stale.revised")} value={money(2610)} />
    </Trace>
  );
}

/**
 * The Item nobody chased: a count that does not reach the total, against a deadline that
 * has.
 *
 * *3 of 4* is the whole trace — it is the shape of the number that carries it, not the
 * number, and a reader who has run a tender recognises the fraction before they read the
 * label. The deadline underneath is what makes it a failure rather than a status; three of
 * four quoted is fine on a Tuesday and it is the bid on the morning it is due.
 */
export function MissedTrace() {
  const t = useTranslations("trace");

  return (
    <Trace>
      <Row label={t("missed.quoted")} value={t("missed.quotedValue")} />
      <Row label={t("missed.due")} value={t("missed.dueValue")} />
    </Trace>
  );
}

/**
 * The tender with nothing left to look back at: the outcome survived, the reasoning did not.
 *
 * Three rows rather than two, and the third is the point. One row with something in it and
 * two with {@link ABSENT} is the exact shape of what a company keeps by accident — everybody
 * remembers that it was awarded and roughly when, and nobody can say who else quoted or what
 * decided it. Said as a sentence that is a complaint; drawn as two blank right-hand cells
 * under a filled one it is a record, and a reader can check it against their own.
 */
export function LostTrace() {
  const t = useTranslations("trace");

  return (
    <Trace>
      <Row label={t("lost.awarded")} value={t("lost.awardedValue")} />
      <Row label={t("lost.who")} value={ABSENT} />
      <Row label={t("lost.why")} value={ABSENT} />
    </Trace>
  );
}
