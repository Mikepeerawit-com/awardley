import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import type { SheetItem } from "@/lib/comparison/sheet";
import type { QuotePhoto } from "@/lib/images/quote-photos";
import type { Quote, RuledOut } from "@/lib/quotes/quotes";
import messages from "@/messages/en.json";

import { WorkingSheet } from "./working-sheet";

/**
 * **`rankQuotes` never sees a Quote the Owner ruled out**, and this is the boundary that
 * has to hold it.
 *
 * ADR-0032 leaves `@/lib/comparison/ranking` alone on purpose — it is arithmetic over an
 * array, and which array arrives is the caller's decision. Its own suite therefore cannot
 * catch the failure that matters: a sheet that hands it every row it ever stored ranks
 * offers the Owner has already overruled, and does it silently. Nothing looks broken. The
 * ranking is simply about a field that no longer exists, and the person reading it rings a
 * supplier they discarded last week. That is the *"quietly wrong"* failure `ranking.ts`
 * exists to prevent, arriving through the one door that module cannot watch — so the test
 * lives here, against the rendered sheet, rather than as a comment beside the filter.
 *
 * The case is ADR-0032's own: `isRankable` refuses **Item-wide** on a unit mismatch, so one
 * Quote priced "box of 50" among seven priced per piece costs the whole Item its rank
 * numbers, its `lowest` chip and its ordering. Ruling that one Quote out gives all three
 * back. Nothing else demonstrates as cleanly that a ranking is a statement about the field
 * under consideration rather than about every row ever entered — and if it does not happen,
 * the filter is in the wrong place.
 *
 * jsdom, not a browser: everything asked here is what was drawn and what it says, never how
 * wide it came out. The sheet's widths are `working-sheet.layout.test.tsx`'s, at 390×844 in
 * real Chromium, because jsdom has no layout engine and would pass an overflowing page.
 *
 * Both action boundaries are stubbed. Nothing here presses anything: openness is derived and
 * the mark is a server write, so what a press does is `quotes.test.ts`'s to prove.
 */

vi.mock("@/app/actions/comparison", () => ({
  selectQuoteAction: async () => ({}),
  setLandedCostAction: async () => ({}),
  setSellingPriceAction: async () => ({}),
}));

vi.mock("@/app/actions/quotes", () => ({
  ruleOutQuoteAction: async () => ({}),
  reopenQuoteAction: async () => ({}),
}));

describe("a ruled-out quote leaves the ranking", () => {
  it("costs the whole item its ranking while the odd unit is still in the field", () => {
    // The precondition, stated rather than assumed: without it the test below could pass on
    // an Item that was never refused in the first place.
    renderSheet(syringes());

    expect(screen.getByText(messages.comparison.banner.unitMismatch.title)).toBeDefined();
    expect(ranks()).toEqual(Array.from({ length: 8 }, () => "·"));
    expect(screen.queryAllByText(messages.comparison.quote.lowest)).toHaveLength(0);
  });

  it("gives the item its ranking back when the odd unit is ruled out", () => {
    renderSheet(syringes({ ruleOut: ["box-of-50"] }));

    // No refusal left to make: every Quote still under consideration is priced per piece.
    expect(
      screen.queryByText(messages.comparison.banner.unitMismatch.title),
    ).toBeNull();
    // Rank numbers, in order, over the seven that are left.
    expect(ranks()).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    // And the chip, which an unrankable Item never draws at all.
    expect(screen.getAllByText(messages.comparison.quote.lowest)).toHaveLength(1);
    // Cheapest first, which is the ordering the refusal had also taken away.
    expect(suppliers()).toEqual([
      "Kanghua 1.90",
      "Sunmed 2.10",
      "Medline 2.30",
      "Improve 2.50",
      "Zhende 2.70",
      "Ansell 2.90",
      "Siam 3.10",
    ]);
  });

  it("renumbers the ranks and moves the lowest chip over what is left", () => {
    // The consequence ADR-0032 says to accept out loud: **rank 1 can change identity as a
    // result of the Owner's own act.** Legitimate — a human judged, the app did not — and
    // pinned here so that it is a decision rather than a surprise.
    renderSheet(syringes({ ruleOut: ["box-of-50", "piece-1.90"] }));

    expect(ranks()).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(suppliers()[0]).toBe("Sunmed 2.10");
    expect(lowestSupplier()).toBe("Sunmed 2.10");
  });

  // `duplicate_supplier` firing about a duplicate no longer in play is the same species of
  // stale claim as a ranking over discarded offers, and it is the banner that proves the
  // filter reaches `itemBanners` too and not only `rankQuotes`. Two tests rather than a
  // before/after inside one: the suite's cleanup runs between tests, so a second sheet drawn
  // mid-test would leave the first one's banner on screen to be found.
  it("names a supplier quoted twice while both offers are standing", () => {
    renderSheet(syringes({ duplicate: true }));

    expect(
      screen.getByText(messages.comparison.banner.duplicateSupplier.title),
    ).toBeDefined();
  });

  it("stops naming them once one of the two is ruled out", () => {
    renderSheet(syringes({ duplicate: true, ruleOut: ["duplicate"] }));

    expect(
      screen.queryByText(messages.comparison.banner.duplicateSupplier.title),
    ).toBeNull();
  });
});

describe("a ruled-out quote is a stub", () => {
  it("folds to one line carrying the supplier name, which is the whole of the undo", () => {
    renderSheet(syringes({ ruleOut: ["box-of-50"] }));

    // Addressed by what pressing it does, which is what the line has to say to a reader who
    // cannot see that a state chip and a supplier name are a control.
    const stub = screen.getByRole("button", {
      name: "Reopen the quote from Kanghua box of 50",
    });

    // And it carries both halves of what it folded: the judgement, and the offer judged.
    expect(stub.textContent).toContain(messages.comparison.quote.ruledOut);
    expect(stub.textContent).toContain("Kanghua box of 50");
    // And it is out of the table entirely — a stub is not a row with the numbers taken off.
    expect(suppliers()).not.toContain("Kanghua box of 50");
  });

  it("carries no select button, so selecting one means reopening it first", () => {
    renderSheet(syringes({ ruleOut: ["box-of-50"] }));

    // Seven competing Quotes, seven ways to end the Item. The eighth offer is on the sheet
    // and has none: `Selected` means "the Quote we chose to build our Bid from" and Ruled
    // Out means unsuitable, and a Quote carrying both is a sentence the sheet cannot render.
    expect(screen.getAllByRole("button", { name: messages.comparison.select })).toHaveLength(
      7,
    );
  });

  it("offers the control on every quote still under consideration, and not on a stub", () => {
    renderSheet(syringes({ ruleOut: ["box-of-50"] }));

    expect(screen.getAllByRole("button", { name: /^Rule out / })).toHaveLength(7);
    expect(
      screen.queryByRole("button", { name: "Rule out Kanghua box of 50" }),
    ).toBeNull();
  });

  it("does not tell the owner nothing was recorded when every quote is a stub", () => {
    // Five offers arrived and the Owner judged none of them fit is a different sentence from
    // nobody having sourced the Item, and reading the two as one condition would lose the
    // distinction `No Supplier Found` was created to make. What that sentence should say is
    // #167's; that it must not be this one is settled here.
    renderSheet(syringes({ ruleOut: ["all"] }));

    expect(screen.queryByText(messages.comparison.noQuotes)).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /^Reopen the quote from / }),
    ).toHaveLength(8);
  });
});

describe("offers arrived and none of them fit", () => {
  it("says so, in a sentence neither of the other two empty states could say", () => {
    renderSheet(syringes({ ruleOut: ["all"] }));

    expect(
      screen.getByText(messages.comparison.banner.allRuledOut.title),
    ).toBeDefined();
    // Item-level and stacked above the quote list with the others, never on a row — and
    // here there is no row left for it to sit on anyway.
    expect(screen.queryByText(messages.comparison.noQuotes)).toBeNull();
  });

  it("does not raise it while one offer is still standing", () => {
    renderSheet(syringes({ ruleOut: ["box-of-50"] }));

    expect(
      screen.queryByText(messages.comparison.banner.allRuledOut.title),
    ).toBeNull();
  });

  it("leaves the item open, because this one needs going back to the assignee", () => {
    // `derivedOpen` means *the work here is done* and this is the opposite, so it stays
    // keyed on `selected_quote_id` alone. Folding would also shut the banner away inside
    // the panel it lives in, which is the whole of what this Item has to say.
    renderSheet(syringes({ ruleOut: ["all"] }));

    const twisty = screen.getByRole("button", { name: /^Fold / });

    expect(twisty.getAttribute("aria-expanded")).toBe("true");
  });
});

/* =======================================================================
   One Item, eight offers, and one of them priced by the box.
   ======================================================================= */

const tenderId = "8f14e45f-ceea-4d67-b4a7-4c5e2f6a1b90";
const itemId = "item-syringes";

const judged: RuledOut = {
  byUserId: "user-owner",
  at: "2026-08-20T02:00:00.000Z",
  note: null,
};

/**
 * The prices are per piece in THB and deliberately far apart: nothing here should turn on
 * `too_close_to_call`, which is about two rates frozen on different days and has its own
 * fixtures next door in `ranking.test.ts`. The supplier names carry their own price so that
 * an assertion about ordering reads as one.
 */
const perPiece: [string, number][] = [
  ["Medline 2.30", 2.3],
  ["Sunmed 2.10", 2.1],
  ["Siam 3.10", 3.1],
  ["Kanghua 1.90", 1.9],
  ["Zhende 2.70", 2.7],
  ["Improve 2.50", 2.5],
  ["Ansell 2.90", 2.9],
];

function quote(
  id: string,
  supplierName: string,
  unitPrice: number,
  quotedUnit: string,
  ruledOut: RuledOut | null,
): Quote {
  return {
    id,
    tenderItemId: itemId,
    supplierName,
    unitPrice,
    currency: "THB",
    quotedUnit,
    // A THB Quote is not converted at all, so both rates are 1 and the row draws one figure.
    unitPriceReporting: unitPrice,
    fxRateMid: 1,
    fxRateApplied: 1,
    fxRateAsOf: "2026-08-11",
    fxRateIsStale: false,
    leadTimeDays: 30,
    matchType: "exact",
    alternativeProductName: null,
    detailNotes: null,
    quotedAt: "2026-08-12",
    sourcedByUserId: "user-nok",
    sourcedByName: "Nok W.",
    ruledOut,
  };
}

/**
 * The Item, and which of its offers the Owner has ruled out.
 *
 * `ruleOut` names them rather than indexing them, so a test reads as the judgement it is
 * making: the odd unit, the cheapest, the duplicate.
 */
function syringes({
  ruleOut = [],
  duplicate = false,
}: { ruleOut?: string[]; duplicate?: boolean } = {}): SheetItem {
  const out = (key: string) =>
    ruleOut.includes("all") || ruleOut.includes(key) ? judged : null;

  return {
    id: itemId,
    productName: "Disposable syringe 5 ml with 23G needle",
    description: "Luer slip, sterile, single use",
    quantity: 20000,
    unit: "piece",
    selectedQuoteId: null,
    landedCostPerUnit: null,
    landedCostConfirmedAt: null,
    sellingPricePerUnit: null,
    quotes: [
      // Entry order, as `listQuotesByItem` returns it — so the ranking on screen is one the
      // sheet computed and not one the fixture handed it pre-sorted.
      quote("q-box", "Kanghua box of 50", 95, "box of 50", out("box-of-50")),
      ...perPiece.map(([supplierName, unitPrice]) =>
        quote(
          `q-${unitPrice}`,
          supplierName,
          unitPrice,
          "piece",
          out(`piece-${unitPrice.toFixed(2)}`),
        ),
      ),
      // A second row from a supplier already on the Item, added only where a test is about
      // the banner that names it.
      ...(duplicate
        ? [quote("q-dup", "Sunmed 2.10", 2.05, "piece", out("duplicate"))]
        : []),
    ],
    sourcing: { quoteCount: 8, noSupplierFound: [] },
  };
}

/**
 * **The money layer, which the plan either bought or did not** (#179, ADR-0040).
 *
 * The figures are gone before they reach this component — `loadTenderScreen` nulls the
 * three columns rather than flagging them — so what is asserted here is the other half of
 * the rule, and the half a null cannot state: the *places* somebody would type a figure
 * into. An empty "Cost to us / unit" box on a plan without the money layer is an
 * invitation to type into a field whose write refuses, and a totals bar summing three
 * nulls reads as a Tender worth nothing rather than a Tender whose worth is not on this
 * plan.
 *
 * The opposite claim is tested alongside it, because it is the one that makes the free
 * tier a product: everything that is not money stays. Eight Quotes, ranked, converted,
 * selectable, with the Owner's rule-outs intact — the whole sourcing mechanism, which is
 * what this screen mostly is.
 */
describe("a plan without the money layer", () => {
  it("draws no cost, no selling price and no totals bar", () => {
    renderSheet(syringes(), false);

    expect(screen.queryByText(messages.comparison.label.landedCost)).toBeNull();
    expect(screen.queryByText(messages.comparison.label.selling)).toBeNull();
    expect(screen.queryByText(messages.comparison.totals.bidTotal)).toBeNull();
    expect(screen.queryByText(messages.comparison.totals.landedCost)).toBeNull();
  });

  it("keeps every quote ranked, and the selection that decides between them", () => {
    renderSheet(syringes({ ruleOut: ["box-of-50"] }), false);

    expect(ranks()).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(screen.getAllByText(messages.comparison.quote.lowest)).toHaveLength(1);
    expect(screen.getAllByText(messages.comparison.select)).toHaveLength(7);
  });

  it("draws all of it again on a plan that has the money layer", () => {
    // The control, and not a formality: a sheet that had stopped drawing its pricing for
    // everybody would pass both assertions above.
    renderSheet(syringes());

    expect(screen.getByText(messages.comparison.label.landedCost)).toBeDefined();
    expect(screen.getByText(messages.comparison.label.selling)).toBeDefined();
    expect(screen.getByText(messages.comparison.totals.bidTotal)).toBeDefined();
  });
});

function renderSheet(item: SheetItem, moneyLayer = true) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Bangkok">
      <WorkingSheet
        tenderId={tenderId}
        items={[item]}
        photos={new Map<string, QuotePhoto[]>()}
        referenceImages={[]}
        reportingCurrency="THB"
        // On by default, because every test above this one is about the ranking and the
        // paid shape is the one they were all written against.
        moneyLayer={moneyLayer}
      />
    </NextIntlClientProvider>,
  );
}

/** The rank column, top to bottom — `·` on every row of an Item nothing may rank. */
function ranks(): string[] {
  return quoteRows().map((row) =>
    // The cell also holds the card's screen-reader-only column heading, which is the `<thead>`
    // saying the same word at a width where there is no `<thead>` to say it.
    row.querySelectorAll("td")[0].textContent!.replace(/rank/i, "").trim(),
  );
}

/** The supplier column, in the order the rows were drawn in. */
function suppliers(): string[] {
  return quoteRows().map(
    (row) => row.querySelectorAll("td")[1].querySelector("span")!.textContent!,
  );
}

/** Whichever supplier the `lowest` chip is sitting on. */
function lowestSupplier(): string {
  const chip = screen.getByText(messages.comparison.quote.lowest);

  return chip.closest("tr")!.querySelectorAll("td")[1].querySelector("span")!.textContent!;
}

function quoteRows(): HTMLTableRowElement[] {
  return [...document.querySelectorAll<HTMLTableRowElement>("tbody tr")];
}
