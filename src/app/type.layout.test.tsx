import { describe, expect, it } from "vitest";

import "@/app/globals.css";

import { familiesIn, fontStack, quietTiers, typeScale, typeTier } from "@/test/layout";

/**
 * **The two facts about type that are invisible until they break** (ADR-0019).
 *
 * Both were expensive to reach and neither shows up in a screenshot taken on the machine
 * that has the fonts installed, which is why they are pinned here rather than left to the
 * contact sheet.
 *
 * **No CJK webfont is fetched.** A Han face cannot be subset — there is no 100-glyph
 * slice of a script with tens of thousands of characters — so web-loading one is
 * megabytes over a phone network inside the WeCom webview, on the exact path a Group
 * Robot reminder link takes. The stack is declared in full and drawn by the device.
 *
 * **The `var()` fallbacks are load-bearing.** `next/font` defines the Latin family's
 * variable on the real `html` element and defines it nowhere else — not here, and not in
 * any browser test. A stack whose head were a bare `var(--font-…)` would, without it,
 * substitute nothing, invalidate the whole declaration at computed-value time and fall
 * all the way back to the browser's default serif, taking the CJK half of the stack with
 * it. Naming the family inside the fallback keeps the rest of the stack reachable either
 * way — and this file is exactly the condition that guards, because it renders the app's
 * stylesheet with no `next/font` anywhere near it.
 */

/** ADR-0019's stack, in the order the device is asked to try it. */
const cjkStack = [
  "PingFang SC",
  "Hiragino Sans GB",
  "Source Han Sans SC",
  "Noto Sans SC",
  "Microsoft YaHei",
];

describe("the declared type stack, rendered without next/font", () => {
  it.each([
    ["--font-sans", "the body face"],
    ["--font-mono", "the numeral face"],
  ])("keeps the whole of %s: %s", (token) => {
    const declared = familiesIn(fontStack(token));

    // The head of the stack is the Latin family, named literally inside the `var()`
    // fallback. Without it the declaration is invalid and everything below is gone.
    expect(declared[0]).not.toBe("");
    expect(cjkStack).not.toContain(declared[0]);

    // And the CJK families are all still there, in order, behind it.
    expect(declared.filter((family) => cjkStack.includes(family))).toEqual(cjkStack);
  });

  it("fetches no font file for a CJK family", () => {
    const faces = fontFaces();

    // The check can only fail if there is something to look at, and a harness that
    // loaded no stylesheet at all would report a clean bill of health forever.
    expect(document.styleSheets.length).toBeGreaterThan(0);

    expect(faces.filter((family) => cjkStack.includes(family))).toEqual([]);
  });
});

/** Every family this page has asked a server for a font file for. */
function fontFaces(): string[] {
  return [...document.styleSheets].flatMap((sheet) =>
    [...sheet.cssRules]
      .filter((rule) => rule instanceof CSSFontFaceRule)
      .map((rule) => rule.style.getPropertyValue("font-family").replace(/^["']|["']$/g, "")),
  );
}

/**
 * **The type scale, held to its shape rather than to its numbers** (#153).
 *
 * The scale is stated once in `globals.css` and half of it is a second rule per script.
 * Nothing could see that half until #153: the ground in `@/test/screens` carried no `lang`
 * at all, so every guard in this project — and the contact sheet somebody eyeballs
 * `zh-Hans` on first — drew both locales with the Latin rules and told them apart only by
 * which strings they held. That is the fault ADR-0019 keeps finding one layer out each
 * time, and this is the check that makes it a fault a build can report.
 *
 * **It pins the shape and not one pixel**, in the same spirit as the contrast walk: which
 * tier is louder than which, that each script's headings step above body weight, and that
 * every tier really does read differently in the two scripts. Every size and every weight
 * in the table stays free to move, and a tier that quietly lost its CJK rule — or gained a
 * Latin one that was never split — fails here rather than on somebody's phone.
 */

// The scale and the quiet tiers are `@/test/layout`'s, since `spacing.layout.test.tsx`
// walks the same list: a tier added to `globals.css` and to only one of two copies is a
// tier one suite silently stops measuring.
const scale = typeScale;
const quiet = quietTiers;

/** The tiers that are a heading, and so must sit above body weight in both scripts. */
const headings = ["type-display", "type-section", "type-subhead", "type-group"];

describe.each(["en", "zh-Hans"] as const)("the scale as %s reads it", (locale) => {
  it("descends, loudest first, and takes a real step at every tier", () => {
    const tiers = scale.map((tier) => typeTier(locale, tier));
    const sizes = tiers.map((tier) => tier.size);

    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));

    // Sorted-order on its own passes a scale that is entirely flat, which is the one way
    // a scale can be ordered and say nothing. Every neighbouring pair has to differ —
    // **in size or in weight**, not necessarily in size: `.type-subhead` is body size on
    // purpose, and the step above body's 400 is the whole of what makes it a heading.
    for (const [above, below] of tiers.slice(0, -1).map((t, i) => [t, tiers[i + 1]])) {
      expect([above.size, above.weight]).not.toEqual([below.size, below.weight]);
    }
  });

  it("puts the display tier alone at the top of the weight ladder", () => {
    const display = typeTier(locale, "type-display").weight;
    const others = headings
      .filter((tier) => tier !== "type-display")
      .map((tier) => typeTier(locale, tier).weight);

    for (const weight of others) expect(display).toBeGreaterThan(weight);
  });

  it("draws every heading above body weight, and everything quiet at or below it", () => {
    const body = typeTier(locale, null).weight;

    for (const tier of headings) {
      expect(typeTier(locale, tier).weight, tier).toBeGreaterThan(body);
    }

    for (const tier of quiet) {
      expect(typeTier(locale, tier).weight, tier).toBeLessThanOrEqual(body + 100);
      expect(typeTier(locale, tier).size, tier).toBeLessThan(typeTier(locale, null).size);
    }
  });
});

describe("the half of the scale that is a second rule per script", () => {
  it.each([...scale.filter((tier) => tier !== null), ...quiet])(
    "reads %s differently in zh-Hans than in en",
    (tier) => {
      expect(typeTier("zh-Hans", tier)).not.toEqual(typeTier("en", tier));
    },
  );

  /**
   * The two directions ADR-0019 gives a reason for, asserted as directions rather than as
   * sizes. A Han glyph fills its em box, so the top of the scale comes down; a stroke has
   * to survive being drawn at all, so the bottom goes up.
   */
  it("comes down at the top of the scale and up at the bottom", () => {
    expect(typeTier("zh-Hans", "type-display").size).toBeLessThan(
      typeTier("en", "type-display").size,
    );
    expect(typeTier("zh-Hans", "field-label").size).toBeGreaterThan(
      typeTier("en", "field-label").size,
    );
  });

  /** Tracking is a Latin device: it only crowds glyphs already on a fixed body. */
  it("tracks nothing in zh-Hans", () => {
    for (const tier of [...scale.filter((t) => t !== null), ...quiet]) {
      expect(typeTier("zh-Hans", tier).tracking, tier).toBe(0);
    }
  });

  /** PingFang has a Semibold and nothing above it; asking for more gets a faux bold. */
  it("asks PingFang for no weight it does not have", () => {
    for (const tier of [...scale, ...quiet]) {
      expect(typeTier("zh-Hans", tier).weight, tier ?? "body").toBeLessThanOrEqual(600);
    }
  });
});
