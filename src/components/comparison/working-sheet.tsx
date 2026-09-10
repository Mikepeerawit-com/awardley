import type { ReactNode } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { ItemDisclosure } from "@/components/comparison/item-disclosure";
import { ItemPricing } from "@/components/comparison/item-pricing";
import { SelectQuoteButton } from "@/components/comparison/select-quote-button";
import { ImageCountBadge } from "@/components/images/image-count-badge";
import { Button } from "@/components/ui/button";
import { ChangeFigure } from "@/components/ui/change-figure";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { calendarDate, calendarDateFormat } from "@/lib/calendar-date";
import { sheetTotals } from "@/lib/comparison/pricing";
import {
  itemBanners,
  itemsNeedingDecision,
  needsDecision,
  rankQuotes,
  type ItemBanner,
  type RankedQuote,
} from "@/lib/comparison/ranking";
import type { SheetItem } from "@/lib/comparison/sheet";
// From the currency list rather than from `@/lib/quotes/quotes`, which re-exports it:
// the sheet is rendered on the server in the app and in a real browser by its layout
// test, and that module is `server-only`.
import { reportingCurrency } from "@/lib/fx/currencies";
import type { ReferenceImage } from "@/lib/images/reference-images";
import type { QuotePhoto } from "@/lib/images/quote-photos";
import type { ItemSourcing, Quote } from "@/lib/quotes/quotes";

/**
 * The comparison working sheet — the densest screen in v1, at every width there is.
 *
 * The whole Tender on one page: one row per Tender Item and, under the ones still needing
 * a decision, every competing Quote ranked cheapest-first in THB so eight prices can be
 * read down a column of numbers instead of compared by eye.
 *
 * **One responsive design, not two layouts** (ADR-0009). There is a single component tree
 * here and a single set of behaviours, and exactly one breakpoint in it: at 768px the
 * quote list inside an expanded Item turns from that dense table into one stacked card
 * per Quote. That rule is `QuoteTable`, `QuoteRow` and `Cell`, and it is every `md:` on
 * this screen. Everything else — the Item rows, the banners, the pricing fields, the
 * totals bar — is written once and wraps, so it holds at 390px and at 1280px without
 * knowing which one it is in.
 *
 * **The failure bar is no horizontal overflow anywhere**, and it is cleared by
 * construction rather than by a guard: nothing here scrolls sideways, and there is no
 * `overflow-x` in the app to make a too-wide table look as though it fits. That is the
 * one outcome the design rules out, and `working-sheet.layout.test.tsx` measures it at
 * 390×844 on eight competing Quotes.
 *
 * Two more rules run through everything below.
 *
 * **Openness is derived, not remembered.** Nothing stores which Items were expanded. An
 * Item with no Selected Quote opens; a decided one folds; the header says how many are
 * left, so the page opens showing exactly the work outstanding.
 *
 * **Being loudly unhelpful beats being quietly wrong.** The banners stack above the
 * quotes and never sit on a row or a card, and the first of them refuses to rank the Item
 * at all. A sheet that silently divided "box of 50" by fifty to get a comparable price
 * would not look broken — it would look authoritative, and send somebody to the wrong
 * supplier.
 *
 * Rendered on the server, which is why it is sync rather than `async`: `useTranslations`
 * and `useFormatter` work in a Server Component, and keeping the tree synchronous is what
 * lets the layout test mount the real thing in a real browser instead of a copy of its
 * markup.
 */
export function WorkingSheet({
  tenderId,
  items,
  photos,
  referenceImages,
}: {
  tenderId: string;
  items: SheetItem[];
  /** Every Quote's photos on the Tender, keyed by Quote — one query for the whole page. */
  photos: Map<string, QuotePhoto[]>;
  referenceImages: ReferenceImage[];
}) {
  const t = useTranslations("comparison");
  const undecided = itemsNeedingDecision(items);

  return (
    // A `div` since the Tender detail draws every part inside a `Section`: this was a
    // `<section>` with no heading in it, which is a region a screen reader cannot name
    // and therefore will not offer — a wrapper that cost a landmark and bought nothing.
    // The heading is the `Section`'s now, and it is the first this half of the screen has
    // ever had.
    <div className="flex min-w-0 flex-col gap-field">
      {/* "2 of 4 Items still need a Quote selected" — the sentence that tells somebody
          landing here what the page is currently about. */}
      <div className="bg-muted/60 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-surface px-4 py-3">
        <span className="text-sm font-medium">
          {undecided === 0
            ? t("header.allDecided")
            : t("header.undecided", { count: undecided, total: items.length })}
        </span>
        <span className="text-muted-foreground text-sm">
          {undecided === 0 ? t("header.allDecidedRest") : t("header.undecidedRest")}
        </span>
      </div>

      {/* A list, not a table: the Item's blocks wrap into a column where there is no room
          for a row, which is what makes this half of the screen the same design at 390px
          and at 1280px rather than two of them. */}
      <ul className="bg-card divide-hairline-soft rounded-surface shadow-surface divide-y overflow-hidden text-sm">
        {items.map((item) => (
          <ItemDisclosure
            key={item.id}
            itemId={item.id}
            // Recomputed here on every render, never read back from anywhere.
            derivedOpen={needsDecision(item)}
            openLabel={t("twisty.open", { item: item.productName })}
            foldLabel={t("twisty.fold", { item: item.productName })}
            summary={<ItemSummary tenderId={tenderId} item={item} />}
            panel={
              <ItemPanel
                tenderId={tenderId}
                item={item}
                photos={photos}
                referenceImages={referenceImages.filter(
                  (image) => image.tenderItemId === item.id,
                )}
              />
            }
          />
        ))}
      </ul>

      {/* The whole Tender's money, under the rows it is made of. */}
      <TotalsBar items={items} />

      <p className="type-quiet">{t("derivedNote")}</p>
    </div>
  );
}

/**
 * The totals bar: coverage, Bid total, landed cost, Margin.
 *
 * **Every figure is per-unit × quantity.** The rows above hold per-unit prices, which is
 * what people type and read; a bar that summed those would look like a total and be out
 * by whatever the quantities are — three orders of magnitude on a Tender for 500 boxes,
 * and invisible from the bar itself.
 *
 * Coverage leads, because the three money figures mean nothing without it: a Bid total
 * across two of four Items must not be read as the Tender's.
 *
 * Server-rendered, so it settles when a figure is saved rather than while it is typed.
 * The live arithmetic belongs in the row being edited (`ItemPricing`) — that is where
 * somebody moving a selling price to find a Margin is actually looking.
 */
function TotalsBar({ items }: { items: SheetItem[] }) {
  const t = useTranslations("comparison.totals");
  const tc = useTranslations("comparison");
  const format = useFormatter();
  const totals = sheetTotals(items);

  const thb = (amount: number) =>
    format.number(amount, {
      style: "currency",
      currency: reportingCurrency,
      maximumFractionDigits: 0,
    });

  return (
    <div className="bg-muted/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 rounded-surface px-4 py-3">
      <span className="text-sm font-medium">
        {t("coverage", { priced: totals.pricedCount, total: totals.itemCount })}
      </span>

      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {/* Absolute prices, and so uncoloured. Neither is a movement of money — a Bid
            total is what we are asking and the landed cost is what it costs us — and
            colour on a figure here means direction or it means nothing (ADR-0023). */}
        <Total label={t("bidTotal")}>
          <span className="money text-base font-medium">{thb(totals.bidTotal)}</span>
        </Total>
        <Total label={t("landedCost")}>
          <span className="money text-base font-medium">
            {thb(totals.landedCostTotal)}
          </span>
        </Total>

        <Total label={t("margin")}>
          {totals.marginProvisional ? (
            // One understated cost understates the whole bar. The total is no more final
            // than the least final figure in it — and a bar that put a direction on it
            // would be claiming a direction for a figure that is not yet a figure.
            <span className="text-flag-ink text-xs font-medium">{tc("provisional")}</span>
          ) : (
            // The one figure on the bar that is a difference rather than an amount, so
            // the one that carries a glyph, a sign and a hue.
            <ChangeFigure amount={totals.marginTotal} maximumFractionDigits={0} />
          )}
        </Total>
      </dl>
    </div>
  );
}

/**
 * One figure on the bar, under the name it is read by.
 *
 * The `<dd>` carries no styling of its own: what a figure *is* — an absolute price, a
 * directed change, a figure held back as provisional — decides how it is drawn, and each
 * caller says so where it knows the answer.
 */
function Total({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="field-label">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * The Item itself, what is Selected on it, and its pricing — three blocks on one wrapping
 * line.
 *
 * The flex bases are what used to be column widths, and they do the same job: with room
 * for all three the blocks line up across every Item exactly as a table's columns did,
 * and without it they stack in the order somebody reads them — what the Item is, what we
 * have chosen, what we are charging.
 */
function ItemSummary({ tenderId, item }: { tenderId: string; item: SheetItem }) {
  const t = useTranslations("comparison");
  const tq = useTranslations("quotes");
  // The Tender's own sourcing vocabulary, not the sheet's: these three states are facts
  // about an Item and are named the same wherever an Item is shown.
  const ts = useTranslations("tenders.sourcing");
  // And the Tender's own way of saying how many of a thing there are, for the same
  // reason — `ItemBrief` and the sourcing list already say it this way.
  const ti = useTranslations("tenders.item");
  const format = useFormatter();
  const selected = item.quotes.find((quote) => quote.id === item.selectedQuoteId);

  return (
    <>
      {/* `break-words` for the reason `Cell` carries it, and it was missing here until
          #135: an Item's product name and its Selected Quote's supplier name are two
          strings nobody here chose the length of, and a client who names a line
          `NitrileExaminationGlovesPowderFreeSizeMediumNonSterile` pushed this row — and
          therefore the page — past a 390px phone. `min-w-0` alone does not help: a flex
          item still refuses to shrink below its longest unbroken word unless the word is
          allowed to break. It went unseen because the sheet's own suite composes product
          names with spaces in them; the shared record's are the runs a client really
          sends. */}
      <div className="flex min-w-0 flex-[2_1_16rem] flex-col items-start gap-1.5 break-words">
        {/* `max-w-full` is the other half of the hold, and the half `min-w-0` cannot do.
            `items-start` is what keeps the chips and the button shrink-to-fit rather than
            stretched across the column, and it sizes *every* child to its own content —
            so a span holding an unbroken word is laid out at that word's width and takes
            the page with it, however narrow the column around it was allowed to become.
            The chips below already carry this pair; the two lines of text did not. */}
        <span className="text-foreground max-w-full font-medium">{item.productName}</span>
        {/* **`tenders.item.quantified`, which is the Item's own line and not a second one
            written for this screen.** The sheet had a `comparison.item.quantified` of its
            own reading "40000 × piece · 3 quotes", and the count on the end of it was the
            same count the chip directly beneath states — so an Item with Quotes and no
            refusals said "3 quotes" twice, on adjacent lines. The chips are the ones that
            survive: they distinguish Quoted from No Supplier Found from Not Yet Sourced,
            which the tail of a sentence cannot. Deleting the sheet's copy also picked up
            the `, number` formatting the shared key has and this one never did — the
            quantity reads 40,000 rather than 40000. */}
        <span className="text-muted-foreground max-w-full text-xs">
          {ti("quantified", { quantity: item.quantity, unit: item.unit })}
        </span>

        {/* The three sourcing states. The difference between the last two decides
            whether it is worth waiting before bidding: an Item nobody has touched
            means different work from one somebody has already given up on. */}
        <SourcingChips sourcing={item.sourcing} />

        {/* One per Tender Item, so this is the same fan-out the worklist rows have, on the
            screen a multi-item Tender makes longest — see `tender-row.tsx`. */}
        <Button
          variant="ghost"
          size="sm"
          className="h-11 px-2"
          nativeButton={false}
          render={
            <Link href={`/tenders/${tenderId}/items/${item.id}/quote`} prefetch={false} />
          }
        >
          {ts("source")}
        </Button>
      </div>

      <div className="flex min-w-0 flex-[1_1_11rem] flex-col gap-0.5 break-words">
        <span className="field-label">{t("label.selectedQuote")}</span>

        {selected ? (
          <>
            <span className="text-foreground font-medium">{selected.supplierName}</span>
            <span className="text-muted-foreground text-xs">
              <span className="money text-foreground text-base font-medium">
                {format.number(selected.unitPrice, {
                  style: "currency",
                  currency: selected.currency,
                })}
              </span>{" "}
              {tq("perUnit", { unit: selected.quotedUnit })}
            </span>
            <span className="text-muted-foreground text-xs">
              {tq("sourcedBy", { name: selected.sourcedByName })}
            </span>
          </>
        ) : (
          <span className="font-medium text-flag-ink">
            {t("needsDecision")}
          </span>
        )}
      </div>

      {/* Pricing is inline in the row, not a step of its own: landed cost pre-filled from
          the Selected Quote and editable over it, selling price beside it, and the Margin
          under both, computing in the browser as the digits are typed. */}
      <ItemPricing tenderId={tenderId} item={item} />
    </>
  );
}

/** Everything under the twisty: the client's pictures, the banners, then the ranked Quotes. */
function ItemPanel({
  tenderId,
  item,
  photos,
  referenceImages,
}: {
  tenderId: string;
  item: SheetItem;
  photos: Map<string, QuotePhoto[]>;
  referenceImages: ReferenceImage[];
}) {
  const t = useTranslations("comparison");
  const ranked = rankQuotes(item, item.quotes);
  const banners = itemBanners(item, item.quotes);

  return (
    <div className="flex flex-col gap-field">
      {/* What the *client* sent, at the top of the panel and so within a glance of the
          Quote Photos it exists to be compared against — which on an Alternative is often
          the only way to judge how far the substitute really is. A count opening a
          lightbox, never thumbnails: strips were measured eating the horizontal room the
          money needs, and there is least of it on a phone. */}
      {referenceImages.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("referenceImages.label")}
          </span>
          <ImageCountBadge
            openLabel={t("referenceImages.open", {
              item: item.productName,
              count: referenceImages.length,
            })}
            images={referenceImages}
          />
        </div>
      ) : null}

      {/* Item-level, stacked, and never on a row or a card. Two of the three are
          statements about the ranking, which is a property of the Item and not of any one
          supplier — so the reflow moves them not at all. */}
      {banners.map((banner, index) => (
        <Banner key={`${banner.kind}-${index}`} banner={banner} item={item} />
      ))}

      {ranked.length === 0 ? (
        <p className="type-quiet">{t("noQuotes")}</p>
      ) : (
        <QuoteTable tenderId={tenderId} item={item} ranked={ranked} photos={photos} />
      )}
    </div>
  );
}

/**
 * The competing Quotes — **the one thing on this screen that knows what width it is on**.
 *
 * At 768px and above this is the dense table ticket 09 settled on: eight ranked prices
 * read down a column of numbers, with rank 1 and rank 8 on screen together. Below it, the
 * very same cells become one stacked card per Quote, still ranked cheapest-first, with
 * the rank carried by a numbered pill instead of a column.
 *
 * It is one markup tree either way, and that is the point of ADR-0009: the cells are the
 * same cells, and the breakpoint moves them rather than choosing between two components.
 * A phone-only interaction — a drawer, a drill-down, a swipe deck — would be a second
 * thing to build, change and keep correct in two locales, and three of them were built
 * and set aside to avoid exactly that.
 *
 * **The accepted cost, stated so nobody re-fixes it:** below 768px rank 1 and rank 8 are
 * never on screen together, because about four cards fit a phone. That is the trade the
 * ADR makes, not a defect.
 *
 * The column widths are percentages rather than fixed pixels because a fixed-layout table
 * whose columns add up to more than its container overflows it — the failure bar, at the
 * narrow end of the desktop range instead of on a phone.
 */
function QuoteTable({
  tenderId,
  item,
  ranked,
  photos,
}: {
  tenderId: string;
  item: SheetItem;
  ranked: RankedQuote<Quote>[];
  photos: Map<string, QuotePhoto[]>;
}) {
  const t = useTranslations("comparison");

  return (
    <div className="bg-card rounded-surface shadow-surface max-md:bg-transparent max-md:shadow-none">
      <table className="w-full table-fixed text-sm max-md:block">
        <thead className="max-md:hidden">
          <tr className="text-muted-foreground border-border border-b text-left text-xs">
            <th className="w-[6%] px-2 py-2 font-medium">{t("quote.rank")}</th>
            <th className="w-[15%] px-2 py-2 font-medium">{t("quote.supplier")}</th>
            {/* Never dropped. With the same supplier legitimately quoted twice it is the
                only thing distinguishing two otherwise identical rows (ADR-0004). */}
            <th className="w-[11%] px-2 py-2 font-medium">{t("quote.sourcedBy")}</th>
            <th className="w-[14%] px-2 py-2 font-medium">{t("quote.quotedProduct")}</th>
            <th className="w-[15%] px-2 py-2 text-right font-medium">
              {t("quote.unitPrice")}
            </th>
            {/* No quantity in the heading. It used to read "Line total (40000 piece)",
                and the multiplier it named is stated once already on the Item's own row a
                few lines above — so the column repeated it, and the card below repeated it
                again on every Quote. One key says "Line total" and both places use it. */}
            <th className="w-[14%] px-2 py-2 text-right font-medium">
              {t("quote.lineTotal")}
            </th>
            <th className="w-[12%] px-2 py-2 font-medium">{t("quote.photos")}</th>
            <th className="w-[13%] px-2 py-2" />
          </tr>
        </thead>
        <tbody className="max-md:flex max-md:flex-col max-md:gap-field">
          {ranked.map((row) => (
            <QuoteRow
              key={row.quote.id}
              tenderId={tenderId}
              item={item}
              row={row}
              photos={photos.get(row.quote.id) ?? []}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One Quote: a row at a desk, a card on a phone, and the same cells in the same order
 * both ways.
 *
 * Below the breakpoint the row becomes a grid, so the reflow is a handful of placement
 * rules rather than a second component. **Only the card's first line is two columns**:
 * the rank pill, and the supplier name beside it. Everything under that line runs the
 * full width of the card.
 *
 * The rank used to hold a 1.75rem column open down the whole card, with a 0.75rem gap
 * beside it — 40px of nothing to the left of seven lines, on a 390px screen, taken off
 * the one column there is. The names this sheet carries are long and often unbreakable
 * (a product code, a Chinese supplier's full registered name), so that gutter was paid
 * for in wrapped lines rather than in white space.
 *
 * The heading row is not on screen to say what each cell is, so the cells say it
 * themselves, and in two different ways on purpose. A supplier name, a price and an
 * avatar are self-evident to anybody looking at the card and need the heading only for a
 * screen reader, so those labels are `sr-only` (`CardLabel`). The line total is not: a
 * second money figure under the first, with no column above it, is the one cell a sighted
 * reader would misread — so that label is on the card in ink.
 */
function QuoteRow({
  tenderId,
  item,
  row,
  photos,
}: {
  tenderId: string;
  item: SheetItem;
  row: RankedQuote<Quote>;
  photos: QuotePhoto[];
}) {
  const t = useTranslations("comparison");
  const tq = useTranslations("quotes");
  const format = useFormatter();
  const { quote } = row;
  const isSelected = item.selectedQuoteId === quote.id;
  const isAlternative = quote.matchType === "alternative";

  // The rate and the day it was published, on hover — it belongs within reach of the
  // converted figure and nowhere near the width the money columns need. Repeated into the
  // accessible name, because a `title` is mouse-only and this figure is the whole basis of
  // the ranking the row is claiming.
  const rateTitle = tq("atRate", {
    rate: format.number(quote.fxRateApplied, { maximumFractionDigits: 4 }),
    date: format.dateTime(calendarDate(quote.fxRateAsOf), calendarDateFormat),
  });

  // Whether this row has two figures to show or one. A Quote already in the Reporting
  // Currency is not converted, and repeating its own amount under an `≈` would claim a
  // derivation that never happened — the same refusal the Assignee's card makes.
  const isConverted = quote.currency !== reportingCurrency;

  // The supplier's own amount, formatted once: it leads an unconverted row and sits
  // beneath the converted figure on every other, and the two must not drift apart.
  const supplierAmount = format.number(quote.unitPrice, {
    style: "currency",
    currency: quote.currency,
  });

  return (
    <tr
      className={[
        "border-border border-t align-top",
        // Below the breakpoint the row is a card: a bordered box headed by the rank pill
        // and the supplier it ranks, with everything else stacked full-width beneath.
        "max-md:border-border max-md:grid max-md:grid-cols-[1.75rem_minmax(0,1fr)] max-md:gap-x-3 max-md:rounded-surface max-md:border max-md:p-3",
        // Flag, because this row is a *property* of the Quote — the supplier offered a
        // substitute — and not something that has gone wrong. Alarm would read as the
        // second thing, which is exactly the misreading ADR-0019 keeps it away from.
        isAlternative ? "bg-flag/5 max-md:border-flag/50" : "",
        // Signal: this is the one we chose, which is what signal says.
        isSelected ? "bg-signal/5 max-md:border-signal/60" : "",
      ].join(" ")}
    >
      <td className="text-muted-foreground money px-2 py-3 max-md:col-start-1 max-md:row-start-1 max-md:p-0">
        <CardLabel>{t("quote.rank")}</CardLabel>
        {/* No number at all on an Item something refuses to rank — not a greyed one, not
            a dash pretending to be one.

            Rank 1 is filled in signal because *cheapest first* is the default reading,
            not because it is the right answer — the too-close-to-call banner above exists
            to argue with it. Colour is not the only copy: the number itself says 1. */}
        <span
          className={[
            "max-md:inline-grid max-md:size-7 max-md:place-items-center max-md:rounded-full max-md:text-xs max-md:font-semibold",
            row.rank === 1
              ? "text-signal-ink font-semibold max-md:bg-signal max-md:text-primary-foreground"
              : "max-md:bg-muted",
          ].join(" ")}
        >
          {row.rank ?? "·"}
        </span>
      </td>

      <Cell besideRank className="font-medium">
        {quote.supplierName}
      </Cell>

      <Cell className="text-muted-foreground text-xs">
        <CardLabel>{t("quote.sourcedBy")}</CardLabel>
        {/* `flex` with `min-w-0`, not `inline-flex`: an inline-flex refuses to shrink
            below its content, so the avatar and the name together held this column open
            and pushed the table sideways at 768px — the width ADR-0009 says the table
            comes back at. Sourced-by is never dropped (it is the attribution the whole
            compete-not-divide model rests on), so it wraps instead. */}
        <span className="flex min-w-0 items-center gap-1.5">
          <InitialsAvatar name={quote.sourcedByName} />
          <span className="min-w-0 break-words">{quote.sourcedByName}</span>
        </span>
      </Cell>

      <Cell>
        {isAlternative ? (
          <div className="flex flex-col gap-1 max-md:rounded-control max-md:border max-md:border-flag/40 max-md:bg-flag/10 max-md:p-2">
            <span className="field-label bg-flag-wash text-flag-ink w-fit max-w-full rounded px-1.5 py-0.5 text-[0.7rem] font-medium">
              {tq("matchType.alternative")}
            </span>
            <span className="font-medium">{quote.alternativeProductName}</span>
            <span className="text-muted-foreground text-xs">
              {t("quote.requested", { product: item.productName })}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">{t("quote.asRequested")}</span>
        )}
      </Cell>

      {/*
        **Where the card stops describing the Quote and starts pricing it.**

        Everything above is who and what — the supplier, who found them, whether they
        priced the thing that was asked for. Everything from here is money. On a phone the
        card had neither a rule nor a change of rhythm between the two, so eight lines
        arrived at one weight and the reader had to parse the card to find the figure they
        came for. The hairline is `max-md:` only: at a desk these are two columns of a
        table and the columns already say it.
      */}
      <Cell className="text-right tabular-nums max-md:border-hairline-soft max-md:mt-1 max-md:border-t max-md:pt-2 max-md:text-left">
        <div className="flex flex-col items-end gap-0.5 max-md:items-start">
          <CardLabel>{t("quote.unitPrice")}</CardLabel>

          {/* **The sheet leads with the figure it ranks on** (ADR-0029). The converted
              figure is the one `rankQuotes` orders on, the one `isLowest` marks, and the
              one both the line total and the Landed Cost prefill are built from — so it
              is the one drawn at display size, mono and tabular. Eight competing offers
              have to read as a column of numbers, and `$0.06`, `CN¥0.42` and `THB 2.35`
              at display size are not a column of anything; one currency down the page is.
              A Quote already in the Reporting Currency draws no second line, which is
              what makes every row in this column a THB figure at one size.

              **The `≈` stays at display size with it.** It is the mark that keeps the
              conversion derived, and `CONTEXT.md` constrains provenance rather than
              prominence — shrinking the mark as the figure was promoted is the erosion
              that glossary line exists to prevent.

              **The unit and the stale chip ride on the leading figure's own line.** The
              unit qualifies the figure the reader is comparing on — *2.35 of a baht, per
              piece* — and a stale rate is what makes *that* figure unreliable, so the
              warning belongs on the loudest thing on the card rather than tucked under
              it. A wrapping baseline row, so a long unit drops under the price instead of
              widening the column. */}
          <span className="flex flex-wrap items-baseline justify-end gap-x-1.5 max-md:justify-start">
            <span
              className="money text-xl leading-tight font-medium md:text-base lg:text-xl"
              title={isConverted ? rateTitle : undefined}
            >
              {isConverted ? (
                <>
                  <span className="sr-only">{rateTitle}</span>
                  {tq("approx", {
                    amount: format.number(quote.unitPriceThb, {
                      style: "currency",
                      currency: reportingCurrency,
                    }),
                  })}
                </>
              ) : (
                supplierAmount
              )}
            </span>
            <span className="text-muted-foreground text-xs">
              {tq("perUnit", { unit: quote.quotedUnit })}
            </span>
            {isConverted && quote.fxRateIsStale ? (
              <span className="bg-flag-wash text-flag-ink rounded px-1 py-0.5 text-[0.65rem] font-medium">
                {tq("staleRate")}
              </span>
            ) : null}
          </span>

          {/* The supplier's own amount: what they will invoice, and what the Assignee
              typed in. It does not disappear — but on the Owner's screen it is reference
              rather than the operative number, so it sits under the figure the ranking
              used. It keeps `.money`, because it is still a figure and still has to line
              up with the one above it. */}
          {isConverted ? (
            <span className="money text-muted-foreground text-xs">{supplierAmount}</span>
          ) : null}

          {/* "lowest", never "cheapest": the row is highlighted, not stamped. Absent
              entirely from an Item that cannot be ranked. Kept even beside a rank-1 pill
              that usually says the same thing, because the two disagree exactly when it
              matters: `isLowest` is true on **both** rows of a tie, and rank is not. */}
          {row.isLowest ? (
            <span className="bg-signal-wash text-signal-ink w-fit max-w-full rounded px-1.5 py-0.5 text-[0.7rem] font-medium">
              {t("quote.lowest")}
            </span>
          ) : null}
        </div>
      </Cell>

      {/* The line total sits with the unit price rather than a rule apart from it: both
          are money and the card's one division is the rule above. `-mt-1` closes the gap
          the cells' own spacing leaves, so the two figures read as one block. */}
      <Cell className="text-right tabular-nums max-md:-mt-1 max-md:text-left">
        <span className="text-muted-foreground text-xs md:hidden">
          {t("quote.lineTotal")}{" "}
        </span>
        {row.lineTotalThb === null ? (
          // The Quote is priced in a unit the Item is not counted in. A total here would
          // be out by whatever the pack size is.
          <span className="text-muted-foreground text-xs">{t("quote.notComparable")}</span>
        ) : (
          <span className="money text-base font-medium md:text-sm lg:text-base">
            {format.number(row.lineTotalThb, {
              style: "currency",
              currency: reportingCurrency,
              maximumFractionDigits: 0,
            })}
          </span>
        )}
      </Cell>

      <Cell>
        {/* A count opening a lightbox, never thumbnails. On an Alternative the photo is
            often the only way to judge how far the substitute really is. */}
        <ImageCountBadge
          openLabel={t("quote.openPhotos", {
            supplier: quote.supplierName,
            count: photos.length,
          })}
          images={photos}
        />
      </Cell>

      <Cell className="max-md:pt-2">
        <SelectQuoteButton
          tenderId={tenderId}
          tenderItemId={item.id}
          quoteId={quote.id}
          isSelected={isSelected}
        />
      </Cell>
    </tr>
  );
}

/**
 * A cell of the quote table, and most of the reflow in one place — the rank is the one
 * cell that is not this, because it is the pill in the card's *first* column and is
 * placed by hand.
 *
 * At a desk it is a table cell with the table's padding. Below 768px it is a block
 * spanning the card, with the padding taken off — the card's own padding is what
 * separates it from the border, and a cell keeping its `px-2` would indent every line of
 * the card by an amount only the table needed. `besideRank` is the single exception, and
 * the supplier name is the only cell that asks for it: it is what the pill is ranking, so
 * the two belong on one line, and it is short enough to still fit beside it.
 *
 * `break-words` is the failure bar held structurally rather than by column arithmetic. A
 * product code, a supplier name or a formatted total that is one long token wider than
 * its column pushes the table out past the page, and the columns it has to fit inside
 * change with the locale. Breaking the word is ugly in a way somebody can see and fix;
 * overflowing the page is the outcome ADR-0009 rules out.
 */
function Cell({
  className = "",
  besideRank = false,
  children,
}: {
  className?: string;
  /** Sits in the card's second column, on the rank pill's own line, instead of below it. */
  besideRank?: boolean;
  children: ReactNode;
}) {
  // Written as one branch rather than as two utilities on one element: `col-span-2` and
  // `col-start-2` both write `grid-column`, so an element carrying both is decided by the
  // order Tailwind happens to emit them in rather than by anything stated here.
  const placement = besideRank
    ? "max-md:col-start-2 max-md:row-start-1"
    : "max-md:col-span-2";

  // `empty:hidden`, on the card only: a cell that drew nothing still spent its `py-1`, so
  // a Quote with no photographs left an eight-pixel band where the badge would have been.
  // At a desk the cell has to stay — an omitted `<td>` takes the column with it and the
  // row below stops lining up.
  return (
    <td
      className={`px-2 py-3 break-words max-md:px-0 max-md:py-1 max-md:empty:hidden ${placement} ${className}`}
    >
      {children}
    </td>
  );
}

/**
 * A column heading, for the width at which there are no columns.
 *
 * Present only below the breakpoint, and only to a screen reader: at a desk the `<thead>`
 * above is saying the same words, and a card reader looking at "Nok W." beside an avatar
 * does not need to be told it is who sourced it. The trailing space is load-bearing —
 * without it the heading and the value are read as one run-on word.
 */
function CardLabel({ children }: { children: string }) {
  return <span className="sr-only md:hidden">{children} </span>;
}

function Banner({ banner, item }: { banner: ItemBanner; item: SheetItem }) {
  const t = useTranslations("comparison.banner");
  const format = useFormatter();

  if (banner.kind === "unit_mismatch") {
    return (
      <Notice tone="stop" title={t("unitMismatch.title")}>
        {t("unitMismatch.body", { unit: item.unit })}
      </Notice>
    );
  }

  if (banner.kind === "all_alternatives") {
    return (
      <Notice tone="warn" title={t("allAlternatives.title")}>
        {t("allAlternatives.body", {
          count: banner.quoteCount,
          product: item.productName,
        })}
      </Notice>
    );
  }

  if (banner.kind === "too_close_to_call") {
    return (
      <Notice tone="warn" title={t("tooClose.title")}>
        {t("tooClose.body", {
          leader: banner.leader,
          runnerUp: banner.runnerUp,
          gap: format.number(banner.gapPct, { maximumFractionDigits: 1 }),
          supplier: banner.staleSupplier,
          date: format.dateTime(calendarDate(banner.staleAsOf), calendarDateFormat),
        })}
      </Notice>
    );
  }

  return (
    <Notice tone="info" title={t("duplicateSupplier.title")}>
      {t("duplicateSupplier.body", {
        supplier: banner.supplier,
        prices: banner.quotes
          .map((quote) =>
            t("duplicateSupplier.price", {
              amount: format.number(quote.unitPrice, {
                style: "currency",
                currency: quote.currency,
              }),
              name: quote.sourcedByName,
            }),
          )
          .join(t("duplicateSupplier.and")),
      })}
    </Notice>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "stop" | "warn" | "info";
  title: string;
  children: string;
}) {
  const tones = {
    stop: "border-destructive/40 bg-destructive/10 text-destructive",
    warn: "border-flag/40 bg-flag/10",
    info: "border-border bg-background",
  };

  return (
    <p
      // `break-words` for the reason `Cell` carries it, and it is the same fault caught a
      // second time in #135: three of the four banners name a supplier, and a supplier name
      // is a string nobody here chose the length of —
      // `GuangzhouImproveMedicalInstrumentsCoLtd` arrives with nowhere to break, in a box
      // 390px wide less two paddings.
      //
      // **It fitted on the machine that wrote this and did not fit in CI**, which is the
      // half worth writing down. Under ADR-0019 no Latin webfont is fetched and none
      // resolves in this harness, so the Latin text here is drawn by whatever face the
      // machine has — PingFang on a developer's macOS, something wider on a Linux runner.
      // Judging a width by arithmetic on one machine's metrics is what the ADR says not to
      // do; holding it structurally is what survives the difference. The corollary is that
      // a *green* run of this suite locally is not evidence about the runner either.
      role="note"
      className={`rounded-surface border px-3 py-2 text-sm break-words ${tones[tone]}`}
    >
      <span className="font-semibold">{title}</span> <span>{children}</span>
    </p>
  );
}

/**
 * Which of the three sourcing states this Item is in.
 *
 * Not Yet Sourced is the *absence* of the other two, which is why it is read off an empty
 * sourcing record rather than stored: an Item with a Quote and an Item somebody has given
 * up on have both been answered, and only the untouched one is overdue.
 */
function SourcingChips({ sourcing }: { sourcing: ItemSourcing }) {
  const t = useTranslations("tenders.sourcing");
  const refusals = sourcing.noSupplierFound.length;

  if (sourcing.quoteCount === 0 && refusals === 0) {
    return (
      <span className="bg-muted text-muted-foreground w-fit max-w-full rounded px-2 py-0.5 text-xs">
        {t("notYetSourced")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {sourcing.quoteCount > 0 ? (
        <span className="bg-primary/10 text-foreground w-fit max-w-full rounded px-2 py-0.5 text-xs">
          {t("quoted", { count: sourcing.quoteCount })}
        </span>
      ) : null}
      {refusals > 0 ? (
        <span className="text-foreground w-fit max-w-full rounded bg-flag/20 px-2 py-0.5 text-xs">
          {t("noSupplierFound", { count: refusals })}
        </span>
      ) : null}
    </div>
  );
}
