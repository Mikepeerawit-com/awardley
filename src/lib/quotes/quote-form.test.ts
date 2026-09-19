import { describe, expect, it } from "vitest";

import {
  convertibleCurrencies,
  currencyOptions,
  isConvertibleCurrency,
} from "@/lib/fx/currencies";

import { blankQuote, refusedQuote, submittedQuote } from "./quote-form";

/**
 * What a refused add-quote form gives back to the person who filled it in.
 *
 * React resets an uncontrolled form on *every* function-action submit — the refused ones
 * too — restoring each input from its `defaultValue`. Everywhere else in this app that
 * costs somebody some retyping. Here it costs a price: the form is filled in once, on a
 * phone, either during the call or straight after it, and a supplier does not necessarily
 * repeat a number an hour later.
 *
 * The values come back as raw strings for the same reason the Tender forms' do. `Number("")`
 * is 0, and a price the user left blank must come back blank rather than pre-filled with a
 * zero they never typed — which on this form would be a supplier apparently offering the
 * goods for nothing.
 */

function quoteForm(fields: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value);
  }

  return formData;
}

describe("what a refused Quote form hands back", () => {
  it("keeps a blank price blank, rather than the 0 it parses to", () => {
    const formData = quoteForm({
      supplierName: "Ace Medical",
      unitPrice: "",
      currency: "CNY",
      quotedUnit: "box of 50",
      leadTimeDays: "",
      matchType: "exact",
      alternativeProductName: "",
      detailNotes: "",
      quotedAt: "2026-08-18",
    });

    expect(submittedQuote(formData)).toEqual({
      supplierName: "Ace Medical",
      unitPrice: "",
      currency: "CNY",
      quotedUnit: "box of 50",
      leadTimeDays: "",
      matchType: "exact",
      alternativeProductName: "",
      detailNotes: "",
      quotedAt: "2026-08-18",
    });
  });

  it("keeps the substitute's name through the refusal that was about it", () => {
    // `alternative_unnamed` is refused *because* this field was empty — but a refusal for
    // any other reason must not take a substitute name the user did type down with it.
    const formData = quoteForm({
      supplierName: "Siam Surgical",
      unitPrice: "118",
      currency: "THB",
      quotedUnit: "box of 50",
      leadTimeDays: "21",
      matchType: "alternative",
      alternativeProductName: "Vinyl gloves, powder-free",
      detailNotes: "Two-week lead if we take four boxes.",
      quotedAt: "2026-02-31",
    });

    const state = refusedQuote("invalid_date", submittedQuote(formData));

    expect(state.error).toBe("invalid_date");
    expect(state.submitted).toMatchObject({
      matchType: "alternative",
      alternativeProductName: "Vinyl gloves, powder-free",
      detailNotes: "Two-week lead if we take four boxes.",
    });
  });

  it("reads a field the form did not post as blank, not as undefined", () => {
    // The substitute name input only exists while the toggle says `alternative`, so on an
    // exact match it is genuinely absent from the FormData.
    expect(submittedQuote(quoteForm({ supplierName: "Ace" }))).toMatchObject({
      alternativeProductName: "",
      leadTimeDays: "",
    });
  });
});

describe("the blank form", () => {
  it("starts from the Item's own unit and today's date", () => {
    const blank = blankQuote({
      unit: "box of 50",
      today: "2026-08-21",
      reportingCurrency: "THB",
    });

    // The supplier usually prices in what was asked for, and typing it again is a chance
    // to type it differently — which is what stops the whole Item being ranked.
    expect(blank.quotedUnit).toBe("box of 50");
    expect(blank.quotedAt).toBe("2026-08-21");
  });

  it("defaults to the Tender's Reporting Currency and to an exact match", () => {
    const blank = blankQuote({
      unit: "piece",
      today: "2026-08-21",
      reportingCurrency: "SGD",
    });

    // Most quotes are in the currency the Tender is priced in, and one entered as Dollars
    // by a mis-tapped default is off by whatever the pair is worth, in the direction that
    // makes a Bid look cheap. The literal `THB` that used to sit here was the same guess
    // made once for everybody — the fault #176 exists to delete — so the test asks for a
    // Tender that does not report in THB, which is the only way the difference shows.
    expect(blank.currency).toBe("SGD");
    expect(blank.matchType).toBe("exact");
    expect(blank.unitPrice).toBe("");
  });
});

describe("the currencies on offer", () => {
  it("offers exactly what the server will accept", () => {
    // A picker offering a currency the server rejects is a refusal nobody could have
    // avoided; one missing a currency the server accepts is a supplier who cannot be
    // recorded at all.
    expect([...currencyOptions("THB")].sort()).toEqual(
      [...convertibleCurrencies].sort(),
    );
    expect(currencyOptions("THB").every(isConvertibleCurrency)).toBe(true);
  });

  it("puts the Reporting Currency first, then the two seen in real data", () => {
    expect(currencyOptions("THB").slice(0, 3)).toEqual(["THB", "CNY", "USD"]);
    expect(currencyOptions("SGD").slice(0, 4)).toEqual(["SGD", "CNY", "USD", "AUD"]);
  });

  it("does not offer the Reporting Currency twice when it is one of the other two", () => {
    // The whole picker would otherwise carry thirty-one entries with USD in two of them,
    // and a list that repeats itself reads as a bug in the list rather than in the order.
    const offered = currencyOptions("USD");

    expect(offered.slice(0, 2)).toEqual(["USD", "CNY"]);
    expect(offered).toHaveLength(convertibleCurrencies.length);
    expect(new Set(offered).size).toBe(offered.length);
  });

  it("refuses a currency ECB does not publish", () => {
    // VND and IDR are the trap: one is a currency this business plausibly meets and ECB
    // does not publish, the other looks just as exotic and is on the list.
    expect(isConvertibleCurrency("VND")).toBe(false);
    expect(isConvertibleCurrency("IDR")).toBe(true);
  });
});
