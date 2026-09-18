import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CheckIcon } from "@/components/icons";

/**
 * Three specimens of the product, one under each how-it-works beat.
 *
 * **A specimen rather than an icon.** The three columns had 130 words of prose and nothing
 * to look at, and the obvious fix — a document, a grid and a bell over them — is the one
 * the site has already thrown away twice: the icon vocabulary here is closed at one glyph
 * (the tick), and a picture of a bell illustrates the *noun* in the sentence rather than
 * the thing the product does. What is actually worth showing is the record itself, so each
 * beat gets a small piece of the real surface instead. The reader is shown an Item, a
 * ruling-out and a Reminder, and the paragraph under each one shrinks to a single line
 * because the specimen is now carrying what the paragraph used to have to describe.
 *
 * **The three are one worked example, not three mock-ups.** The Item is the gloves row from
 * the Quotes sheet above and the two quotes are that row's own: 1,795.00 is Supplier B's
 * amount for it, and 1,780.00 is the undercut Supplier C makes on the first move of the
 * sheet's loop — not its opening quote, which is 1,910.00, but a figure a reader who looks
 * twice can still find in the sheet a few hundred pixels up. The Reminder is the one the
 * assignee on that Item would receive. Read top to bottom the row
 * is a single tender moving through the product, which is what the section claims happens;
 * three unrelated screenshots would have claimed three unrelated features.
 *
 * **They are framed and their columns are not.** DESIGN.md is explicit that the
 * how-it-works columns are never boxed — a card with its own hairline reads as one of three
 * things you could pick between, and these are three parts of one mechanism. That still
 * holds: the *column* is a `border-t` hairline and a `gap-label` stack exactly as before.
 * What is boxed is the specimen inside it, on the same 12px inset-sheet frame the Quotes
 * sheet takes inside the product panel, and for the same reason — set as bare text it would
 * read as the page having written a little table, and framed it reads as a piece of the
 * app. The frame is around the evidence, not around the argument.
 *
 * **These are not a second image.** `ProductPanel` argues the page carries exactly one
 * raster and nothing here changes that: like the Quotes sheet, these are HTML surfaces —
 * real text at the reader's own size, in the reader's own language, with tabular numerals
 * that line up, and not one extra byte to download.
 *
 * **Nothing in here moves.** The page has one beat and it belongs to the product panel.
 * These are server components with no state, no `"use client"`, no animation class and no
 * new CSS; the specimen a reader scrolls to is the specimen they keep looking at.
 *
 * The example data is labelled once for the whole row, by the `sheet.example` line above
 * the three columns — the same string the product panel pins to its own corner. Three
 * captions saying the same thing under three specimens would be the label shouting.
 */

/**
 * Grouped and two-placed. Deliberately a copy of the same three lines in
 * `components/quotes-sheet.tsx` rather than an import from it: that module is
 * `"use client"`, so every one of its exports reaches a server component as a client
 * reference rather than as the function itself, and `money(1780)` would be a call on a
 * proxy. Three lines duplicated across a boundary beats a shared module invented to carry
 * them, and the two copies cannot drift apart without the amounts themselves drifting.
 *
 * Exported, because `components/traces.tsx` formats the problem section's two amounts with
 * it. That is an import rather than a third copy precisely because the reason for the second
 * copy does not apply: both modules are server modules, so nothing crosses a boundary and
 * the function arrives as itself. The duplication above is the price of the client boundary,
 * not a house style to be repeated on this side of it.
 */
export function money(amount: number): string {
  return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

/** The Item's quantity, in the component with the amounts and for the same reason: it is
 * the same numeral in both locales, and a quantity translated away from the sheet it
 * belongs to is a quantity that will eventually disagree with it. */
const QUANTITY = "20,000 pcs";

/** The Tender's reference, invented, and the one part of the mail subject that is not copy.
 * The app's own subject is `[Awardley] {reference} · {client} · {title}`; the client is
 * dropped here because the page names no customer, real or otherwise (ADR-0035). */
const REFERENCE = "[Awardley] T-2481";

/**
 * The frame the three share: the page's inset sheet — 12px, a hairline, the page ground —
 * at a fixed height from `md` up, so the three line up across the row and the titles under
 * them sit on one line.
 *
 * The height is set by the tallest of the three at the *narrowest* the grid ever is, which
 * is `md` itself: at 768px the three columns are about 213px wide each, and the Reminder's
 * subject and its deadline line both take two lines there. **Below `md` there is no height
 * at all**, because below `md` there is no row — the grid is one column, the three are
 * stacked at full width, and a plate held open to 13rem there is a plate padded out to match
 * two others the reader cannot see beside it. `overflow-hidden` is the frame's own clip
 * rather than a safety net — nothing here is meant to reach it.
 *
 * **Each specimen names the block that takes up the slack.** One height across three
 * specimens means two of them have room under their content, and a plate with a band of
 * empty ground below its last row does not read as a screen — it reads as a screen that
 * failed to load the rest. The frame used to grow every specimen's last child, which sounds
 * like a rule and was not one: it only ever showed on the Quote, whose last block carries
 * `accent-wash` and so has a ground to grow. Grown over the page's own ground the other two
 * moved the empty band inside their last field and changed nothing a reader could see — 49px
 * of it under the Item, 66px under the Reminder. So the frame is a column and nothing more,
 * and the growing is declared where the right answer differs: the Item spreads the slack
 * evenly across its three blocks, the Quote still fills its wash, and the Reminder pushes its
 * two mail paragraphs apart. What stretches is something the reader can see stretch.
 */
function Specimen({ children }: { children: ReactNode }) {
  return <Plate className="flex flex-col md:h-52">{children}</Plate>;
}

/**
 * The frame itself, with the height taken out of it.
 *
 * {@link BilingualSpecimen} wants the same plate and none of the rest: it is one specimen in
 * a column of its own rather than one of three across a row, so there is nothing for it to
 * line up with, and `h-52` would buy it a band of empty ground under its last row — the very
 * thing the slack rule above exists to prevent, with no row to pay for it.
 *
 * So the fixed height stays in {@link Specimen}, where it is a fact about the how-it-works
 * row, and what is shared is what is actually shared: the 12px radius, the hairline, the page
 * ground and the clip. Forcing the second use into the first one's height would have been a
 * plate sized by a grid it is not in.
 */
function Plate({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-background ${className}`}>
      {children}
    </div>
  );
}

/**
 * A labelled field, in the Quotes sheet's own header grammar: 12px at 500 in muted ink for
 * the label, body ink for the value. Stacked rather than label-left/value-right, because
 * the value is a specification and at `md` there is not 213px of room for both on one line.
 */
function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 border-t border-border px-4 py-3 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-pretty">{value}</p>
    </div>
  );
}

/**
 * An Item as the record holds it: the name, and the two things the client actually asked
 * for against it.
 *
 * The name is its own key rather than the sheet's `rows.gloves`, which carries the quantity
 * baked into the string because a sheet row has one line to say both in. Here the quantity
 * is a field of its own, which is what it is in the product.
 *
 * All three blocks take an equal share of the frame's slack and centre what they hold, which
 * is this specimen's answer to the question {@link Specimen} poses. It has the shortest
 * content of the three and no ground anywhere to grow, so the slack has to go somewhere a
 * reader will not read as missing: split three ways it is about 16px a block at `md`, and an
 * evenly airy record is a record, where 49px under the last field was a record that stopped.
 */
export function ItemSpecimen() {
  const t = useTranslations("spec");

  return (
    <Specimen>
      <p className="flex flex-1 flex-col justify-center px-4 py-3 text-sm font-medium text-pretty">
        {t("item.name")}
      </p>

      <Field
        className="flex-1 justify-center"
        label={t("item.quantity")}
        value={QUANTITY}
      />

      <Field
        className="flex-1 justify-center"
        label={t("item.specification")}
        value={t("item.specificationValue")}
      />
    </Specimen>
  );
}

/**
 * The half of the comparison the big sheet cannot show: a quote ruled out, with the reason
 * on its face.
 *
 * The sheet above picks the lowest amount in the row, because that is the rule a sheet of
 * twelve numbers can apply by itself. The thing a tender actually turns on is the quote
 * that was cheaper and was still wrong — here Supplier C's 1,780.00, against an eight-week
 * lead time — and there is nowhere in a table of amounts to write *why*. So the specimen
 * takes one row of that sheet and opens it: the same Item, the same two figures, and the
 * sentence that decided between them.
 *
 * **The struck-out quote is the cheapest in the row**, and it has to be. Rule out the
 * dearer of two amounts and the specimen has written a reason for a decision the sheet
 * above already reaches by counting — the whole argument for writing a reason down is that
 * the amounts alone reach the *other* answer.
 *
 * So the specimen and the sheet disagree about one cell, on purpose. 1,780.00 is what the
 * sheet ticks for half of its loop — Supplier C's undercut, the first move of
 * `quotes-sheet.tsx`'s script — because lowest-in-the-row is the only rule twelve numbers
 * can apply to themselves. This is what a person does with that tick once the lead time is
 * on the table: overrides it, and says why. A struck-out quote the sheet never selects
 * would have been a reason nobody needed.
 *
 * It is the one of the three that carries a header, and the header is the Item name rather
 * than a label. Two amounts with nothing over them are quotes for nothing; the other two
 * specimens say what they are by being themselves.
 */
export function RuleOutSpecimen() {
  const t = useTranslations("spec");
  const tSheet = useTranslations("sheet");

  return (
    <Specimen>
      <p className="border-b border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground">
        {t("item.name")}
      </p>

      <div className="flex flex-col gap-0.5 px-4 py-3 text-muted-foreground">
        <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
          <span>{tSheet("supplierC")}</span>
          <span>{money(1780)}</span>
        </div>

        <p className="text-xs text-pretty">
          {t("ruleOut.ruledOut")} · {t("ruleOut.reason")}
        </p>
      </div>

      {/*
        The selected quote in the sheet's own treatment and no other: `accent-wash`, weight
        500, full ink, and the 14px tick that is the site's entire icon vocabulary. Said in
        words as well as in colour, because this specimen is not operable and `aria-pressed`
        — which is how the real sheet says it — has nothing here to be pressed.

        It is also this specimen's answer to the frame's slack, and the only one of the three
        that can simply grow: the wash is a ground, so a taller wash is a taller selected row
        and reads as one. Its content stays at the top of it for the same reason — the row
        begins where the hairline above it says it does.
      */}
      <div className="flex flex-1 flex-col gap-0.5 border-t border-border bg-accent-wash px-4 py-3 font-medium">
        <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
          <span>{tSheet("supplierB")}</span>

          <span className="flex items-center gap-1.5">
            <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
            {money(1795)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{t("ruleOut.selected")}</p>
      </div>
    </Specimen>
  );
}

/**
 * The Reminder, which the page has so far only ever claimed.
 *
 * *Reminders by email* is the third fact under the hero and the last of the three beats,
 * and until now the nearest the page came to showing one was a banner sliding over the
 * phone capture — a notification *about* an email rather than the email. This is the mail
 * itself, and its lines are the app's own: the subject is `email.reminder.subject` with the
 * client dropped, the deadline is `email.reminder.milestone.internal_quote` cut to the one
 * clause that is the reminder, and *Items awaiting your quote:* is `email.reminder.items`
 * verbatim. Under it, one Item — the same Item the other two specimens are about, which is
 * the whole point of the assignee beat: the mail is about that person's own items, not
 * about the tender.
 *
 * No envelope, no paper-plane, no bell. The mail is recognisable as mail because it is
 * shaped like mail — a sender, a subject on a ground of its own, then the body.
 *
 * The body takes the frame's slack and puts it *between* its two paragraphs rather than under
 * them, which is the one place on this plate where empty space is already meaningful: mail is
 * read as a deadline line, a gap, then what the deadline is about. The header strip does not
 * grow — a From/subject block stretched to 66px is not a mail header, it is a banner.
 */
export function ReminderSpecimen() {
  const t = useTranslations("spec");

  return (
    <Specimen>
      <div className="flex flex-col gap-1 border-b border-border bg-card px-4 py-2.5">
        <p className="text-xs text-muted-foreground">{t("reminder.from")}</p>

        <p className="text-sm font-medium text-pretty">
          {REFERENCE} · {t("reminder.line")}
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-field px-4 py-3">
        <p className="text-xs text-pretty text-muted-foreground">{t("reminder.deadline")}</p>

        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium text-muted-foreground">{t("reminder.items")}</p>
          <p className="text-sm text-pretty">{t("item.name")}</p>
        </div>
      </div>
    </Specimen>
  );
}

/**
 * One plate for the who-it-is-for section: the same record, read in two languages.
 *
 * **The section's thesis is one record and several people**, and this is that thesis rather
 * than an illustration of any one of the three rows beside it. An owner, the colleague
 * chasing a supplier and the rest of the team are not three products; they are three people
 * who open the same Tender and see it in their own language, and the way to show that is to
 * put the two readings side by side and let a reader check the middle of it themselves.
 *
 * **The record is named once, across the divider.** The item name is the only thing on this
 * plate that is neither chrome nor a numeral, and it used to sit inside both columns — which
 * meant the `zh-Hans` build put `Nitrile gloves, M` under a head reading 中文 while every
 * other mention of that item on the page read 丁腈手套（中号）. To a reader of Chinese that is
 * not a claim about one record; it is a translation that did not happen, on the one plate
 * whose whole job is to be checked. So the name moves up into a strip that spans both columns
 * and takes `spec.item.name` like the rest of the page: it is one record, so it literally
 * crosses the hairline rather than being printed twice beside it, and the columns under it
 * are left holding numerals only. A numeral cannot be misread as untranslated, and the shape
 * now states the argument by itself — one record above, two readings under it.
 *
 * **The labels differ and every value is identical, character for character.** `Quantity` and
 * `数量` are chrome; `20,000 pcs` and `1,795.00` are the record. That is the entire argument,
 * and it is the one claim on the page that would be destroyed by translating it well. `pcs`
 * stays Latin in the 中文 column deliberately: it is a unit symbol, written that way on
 * Chinese trade paperwork, and it is {@link QUANTITY} — the same string, to the character,
 * that the Item specimen shows in both builds. The amount comes from {@link money}, the same
 * formatter as the sheet, so the two columns cannot drift into different groupings.
 *
 * **The labels are hardcoded, and it is not an oversight.** They are not localisable because
 * they *are* the two locales: they must render identically in the `en` build and the
 * `zh-Hans` build, or the claim they make is only true in one of them. Same precedent as
 * {@link QUANTITY} and {@link REFERENCE}. The name above them is the exact opposite and is
 * the one localised string on the plate — it is the record, and a record is read in the
 * reader's own language. The plate is now both halves of that sentence at once.
 *
 * **The `lang` attributes are real.** `globals.css` drops the tracking and opens the leading
 * of Han through `:lang(zh-Hans)`, and the Han stack is the device's because the site fetches
 * no CJK webfont (ADR-0035). Marking the right column is what makes those rules fire, so the
 * Chinese on this plate is set the way Chinese is set everywhere else on the site — which is
 * the claim, drawn rather than asserted. Left as unmarked Latin it would be Chinese words in
 * English typography, and a reader who reads Chinese would see the page fail its own test.
 * The name strip carries no `lang` of its own on purpose: it is in whichever language the
 * document is in, which is what the `<html lang>` above it already says.
 *
 * Two columns at every width, `md:`-independent. The plate lives in a narrow column that is
 * already at most `sm` wide, so there is no breakpoint at which it is wide enough to want a
 * different shape — and stacking the two readings vertically would turn a comparison into a
 * list, which is the one thing it must not be.
 */
export function BilingualSpecimen() {
  const t = useTranslations("spec");

  return (
    <Plate>
      {/*
        The record, in {@link ItemSpecimen}'s own treatment — 14px at 500 in body ink on the
        plate's ground — rather than in the muted header grammar the language strips take
        below it. The name is not this plate's chrome; it is the thing the plate is about, and
        the two strips under it are what divides it.
      */}
      <p className="border-b border-border px-4 py-3 text-sm font-medium text-pretty">
        {t("item.name")}
      </p>

      {/*
        The divider starts here, under the name, which is the whole point: the hairline splits
        the readings and not the record. Each strip is the sheet's header grammar — `card`
        ground, 12px at 500 in muted ink — and carries no `border-b` of its own, because the
        hairline under it is the first `Field`'s `border-t`, the same 1px in the same colour,
        and the two would otherwise stack into a 2px rule no other plate on the site has.
      */}
      <div className="grid grid-cols-2 divide-x divide-border">
        <div lang="en">
          <p className="bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground">English</p>

          <Field label="Quantity" value={QUANTITY} />
          <Field label="Selected quote" value={money(1795)} />
        </div>

        <div lang="zh-Hans">
          <p className="bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground">中文</p>

          <Field label="数量" value={QUANTITY} />
          <Field label="已选报价" value={money(1795)} />
        </div>
      </div>
    </Plate>
  );
}
