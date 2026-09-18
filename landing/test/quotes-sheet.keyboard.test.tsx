import { cleanup, render, screen } from "@testing-library/react";
import { page, userEvent } from "vitest/browser";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import "@/app/globals.css";

import en from "@/messages/en.json";
import { HomeContent } from "@/components/home";
import { QuotesSheet } from "@/components/quotes-sheet";
import { phone } from "@/test/layout";

/**
 * #197's bar: the sheet is one stop on the way to the form, not twelve.
 *
 * The page's only real ask is the waiting-list form, and before this the twelve amounts
 * sat between the hero buttons and everything else — twelve stops on a surface the page
 * itself labels *Example data*. So the sheet takes the grid pattern every other operable
 * table takes: one tab stop in, the arrow keys inside.
 *
 * A real browser rather than jsdom, because every assertion here is a browser fact —
 * where `Tab` goes, what `:focus-visible` draws, and whether an outline offset outwards
 * would be clipped by the frame the sheet sits in.
 *
 * Rendered in that frame, `overflow-hidden` and all, for the same reason: a focus ring
 * measured on a bare table is measured somewhere the sheet never is.
 */

afterEach(cleanup);

// The suite's own width is the phone the rest of the browser project is measured at, and
// the one test below that needs a desk puts it back.
afterEach(async () => {
  await page.viewport(phone.width, phone.height);
});

function draw(): HTMLButtonElement[] {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <QuotesSheet />
      </div>
    </NextIntlClientProvider>,
  );

  return [...document.querySelectorAll<HTMLButtonElement>("tbody button")];
}

/**
 * The cell at `row`/`column`, in the reading order the twelve buttons are drawn in. Three
 * across is written out rather than imported, so that a fourth supplier fails the count in
 * the first test — which names the number — rather than quietly shifting every index here.
 */
function at(row: number, column: number): number {
  return row * 3 + column;
}

describe("the Quotes sheet's keyboard", () => {
  it("is one tab stop, not twelve", async () => {
    const cells = draw();

    expect(cells).toHaveLength(12);
    expect(cells.filter((cell) => cell.tabIndex === 0)).toEqual([cells[0]]);

    await userEvent.tab();
    expect(document.activeElement).toBe(cells[0]);

    // And out again in one, which is the whole of what #197 asks: the reader heading for
    // the form passes the sheet, rather than walking it.
    await userEvent.tab();
    expect(document.activeElement).not.toBe(cells[1]);
    expect(cells[1].contains(document.activeElement)).toBe(false);
  });

  it("moves between cells with the arrow keys, and stops at the edges", async () => {
    const cells = draw();

    await userEvent.tab();

    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(cells[at(0, 1)]);

    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(cells[at(1, 1)]);

    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(cells[at(1, 2)]);

    // A grid does not wrap: the reader who holds an arrow down against the edge stays on
    // the sheet rather than being thrown into the next row, or out of the table entirely.
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(cells[at(1, 2)]);

    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(cells[at(1, 0)]);

    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(document.activeElement).toBe(cells[at(0, 0)]);
  });

  it("carries the one tab stop with the focused cell", async () => {
    const cells = draw();

    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

    expect(cells.filter((cell) => cell.tabIndex === 0)).toEqual([cells[at(1, 1)]]);

    // Still one stop out of the sheet from wherever the reader left off inside it.
    await userEvent.tab();
    expect(cells.some((cell) => cell === document.activeElement)).toBe(false);
  });

  it("still chooses a Quote from the keyboard", async () => {
    const cells = draw();

    // Row 0 opens on Supplier B at 1,795.00, the lowest of the three.
    expect(cells[at(0, 1)].getAttribute("aria-pressed")).toBe("true");

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(cells[at(0, 0)].getAttribute("aria-pressed")).toBe("true");
    expect(cells[at(0, 1)].getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the labels and the pressed state the sheet already had", async () => {
    const cells = draw();

    expect(cells[at(0, 0)].getAttribute("aria-label")).toBe(
      "Choose Supplier A for Nitrile gloves, M — 20,000",
    );
    expect(cells.every((cell) => cell.hasAttribute("aria-pressed"))).toBe(true);
  });

  it("is one stop between the hero and the form, on the page itself", async () => {
    // The sheet is a `md:` column, absent from the phone layout along with the panel it
    // sits in — so the measure #197 took has to be taken at a width that draws it.
    await page.viewport(1280, 900);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <div lang="en" className="min-h-full flex flex-col font-sans">
          <HomeContent />
        </div>
      </NextIntlClientProvider>,
    );

    const sheet = document.querySelector("table")!;
    const email = screen.getByRole("textbox");
    const stops: Element[] = [];

    // Tab from the top of the page to the waiting list — the walk the issue describes, and
    // the only part of the tab order its claim is about. The bound is a guard against a
    // page that never reaches the form, not a count anybody is asserting.
    for (let step = 0; step < 40 && document.activeElement !== email; step += 1) {
      await userEvent.tab();

      if (document.activeElement !== null) stops.push(document.activeElement);
    }

    expect(document.activeElement).toBe(email);
    expect(stops.filter((stop) => sheet.contains(stop))).toHaveLength(1);
  });

  it("draws a focus ring inside the frame, on the chosen cell as well as a plain one", async () => {
    const cells = draw();

    // The assemble is delay-driven and runs for 1.8s; finishing it is how the wash gets
    // under the chosen cell without this suite waiting the sheet out.
    for (const animation of document.getAnimations()) animation.finish();

    await userEvent.tab();

    for (const cell of [cells[at(0, 0)], cells[at(0, 1)]]) {
      await userEvent.keyboard(cell === cells[at(0, 0)] ? "{Home}" : "{ArrowRight}");
      expect(document.activeElement).toBe(cell);

      const ring = getComputedStyle(cell);

      expect(ring.outlineStyle).toBe("solid");
      expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2);

      // The accent at full strength, which is what clears 3:1 against the wash as well as
      // against the ground — the ring is the same on both cells, not a wash on a wash.
      expect(ring.outlineColor).toBe("rgb(79, 70, 229)");

      // Inwards, or the frame's `overflow-hidden` clips it off the outer column and the
      // reader loses the ring on exactly the cells at the edge of the sheet.
      expect(parseFloat(ring.outlineOffset)).toBeLessThanOrEqual(0);
    }

    // And the two cells it was measured on really are the two grounds.
    const ground = (cell: HTMLButtonElement) =>
      getComputedStyle(cell.closest("td")!).backgroundColor;

    expect(ground(cells[at(0, 1)])).not.toBe(ground(cells[at(0, 0)]));
  });
});
