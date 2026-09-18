import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import "@/app/globals.css";

import en from "@/messages/en.json";
import { HomeContent } from "@/components/home";

/**
 * The page's own focus ring, measured on the two controls the whole page exists to get a
 * reader to: the waiting-list field and its submit.
 *
 * `DESIGN.md` states the ring once — 2px solid `ring` at 2px offset — and both controls
 * ask for it in the same three utilities. Whether they *get* it is a browser fact, and the
 * kind that fails silently: a suppressed outline looks exactly like a control nobody has
 * focused yet. So it is asserted rather than assumed, at full strength and in the accent,
 * which is what clears the 3:1 SC 1.4.11 wants of anything carrying information.
 */

afterEach(cleanup);

function draw() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <div lang="en" className="min-h-full flex flex-col font-sans">
        <HomeContent />
      </div>
    </NextIntlClientProvider>,
  );
}

/** Tab until `target` has the focus, so the ring is reached the way a reader reaches it. */
async function tabTo(target: Element) {
  for (let step = 0; step < 60 && document.activeElement !== target; step += 1) {
    await userEvent.tab();
  }

  expect(document.activeElement).toBe(target);
}

function expectTheSiteRing(control: Element) {
  const ring = getComputedStyle(control);

  expect(ring.outlineStyle).toBe("solid");
  expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(ring.outlineColor).toBe("rgb(79, 70, 229)");
}

describe("the waiting list, reached by keyboard", () => {
  it("rings the email field", async () => {
    draw();

    const email = screen.getByRole("textbox");

    await tabTo(email);
    expectTheSiteRing(email);
  });

  it("rings the submit", async () => {
    draw();

    const submit = screen.getByRole("button", { name: en.beta.submit });

    await tabTo(submit);
    expectTheSiteRing(submit);
  });
});
