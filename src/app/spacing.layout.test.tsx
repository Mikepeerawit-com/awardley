import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "@/app/globals.css";

import { quietTiers, typeScale, typeTier } from "@/test/layout";
import { locales, Screen, screens } from "@/test/screens";

/**
 * **The spacing scale, held to its shape rather than to its numbers** (#154, ADR-0019).
 *
 * The fault this scale was opened to fix is the one ADR-0028 found in the radius scale and
 * #153 found in the type scale, arrived at a third time by a third door: the numbers
 * existed and none of them meant anything, so every call site reached for one near the
 * middle. Almost every stack in the app was `gap-3` or `gap-4`. A label sat 8px from its
 * field, two unrelated fields 12px apart, and two whole sections of a screen 16px apart —
 * **distances close enough that they separated nothing**, which is why a screen read as one
 * undifferentiated column even after #149 gave it headings. The headings said where the
 * parts were and the spacing did not agree with them.
 *
 * This is the check that makes a scale of that shape a thing a build can report.
 *
 * **It pins the shape and not one pixel**, the way `type.layout.test.tsx` does for the
 * type scale. Every value below stays free to move. What is pinned is that the four steps
 * ascend in the order they are stated, that each one is a *real* step above the one below
 * it, and — the claim the whole scale rests on — that one scale is enough for both scripts.
 *
 * **Drawn rather than read.** Each step is measured off a real element wearing the real
 * utility, so a token renamed, a `@theme` block that stopped emitting, or a utility that
 * was never generated at all fails here rather than silently falling back to `normal`.
 */

/**
 * The scale as `globals.css` states it, tightest first, each named for what it separates.
 *
 * The class names are written out rather than built from the step names: Tailwind finds a
 * candidate by scanning the source text, so a `gap-${name}` would generate no utility and
 * this suite would measure four elements with no gap on any of them.
 */
const scale = [
  { step: "label", gap: "gap-label", separates: "a label from the field it names" },
  { step: "field", gap: "gap-field", separates: "one field from the next, inside a group" },
  { step: "group", gap: "gap-group", separates: "one group from the next, inside a part" },
  { step: "landmark", gap: "gap-landmark", separates: "one landmark from the next" },
] as const;

/**
 * **How much bigger a step has to be than the one below it to read as a different step.**
 *
 * The number comes from the failure rather than from taste. The scale being replaced ran
 * 8 / 12 / 16 — ratios of 1.5 and 1.33, which at these sizes is four pixels, and four
 * pixels across a 390px screen is not a distance a reader can see. 1.6 is the floor that
 * fails on both of those joints and passes on the scale that replaced them; a fifth step
 * squeezed in between two of these would fail here rather than quietly rejoining the
 * crowded middle this ticket was raised to empty.
 */
const REAL_STEP = 1.6;

describe("the spacing scale", () => {
  it("ascends, tightest first, in the order it is stated", () => {
    const steps = scale.map((entry) => drawnStep(entry.gap));

    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });

  it("takes a real step at every rung", () => {
    for (const [below, above] of pairs()) {
      expect(
        drawnStep(above.gap) / drawnStep(below.gap),
        `${above.step} (${above.separates}) against ${below.step}`,
      ).toBeGreaterThanOrEqual(REAL_STEP);
    }
  });

  it("draws every step it declares", () => {
    // A `gap` utility that was never generated computes to `normal`, which parses as `NaN`
    // — so an assertion on the ratios alone would pass a scale with nothing in it at all.
    for (const entry of scale) {
      expect(drawnStep(entry.gap), entry.gap).toBeGreaterThan(0);
    }
  });
});

/**
 * **Why one scale carries both scripts, measured rather than asserted** (ADR-0019).
 *
 * ADR-0019's standing instruction is to judge the visual system in `zh-Hans` first, and
 * #153 answered it by splitting the type scale in two: Han fills its em box, so every tier
 * that carries a sentence opens its leading up in `zh-Hans`. The spacing scale is
 * deliberately *not* split, and this is the claim that makes that safe rather than lazy.
 *
 * A gap separates only relative to the rhythm inside the things it separates, and the only
 * thing the script changes about that rhythm is the leading. So the question is arithmetic:
 * **is the most the script moves a line by smaller than the smallest distance between two
 * steps of this scale?** If it is, then a gap that separates in Fira Sans separates in
 * PingFang too, and a second reading per script would be four more numbers to keep in step
 * for a difference no reader could see.
 *
 * If the type scale ever opens Han's leading up far enough to close that margin, this goes
 * red — which is the one warning that a spacing step has stopped saying the same thing in
 * the working language, and it arrives here rather than on somebody's phone.
 */
describe("the one scale, against what the script does to a line of text", () => {
  // Every tier of the type scale, since any of them can sit either side of a gap — read
  // from `@/test/layout` rather than listed here, so a tier added to the scale is one this
  // margin is measured against without anybody remembering to add it twice.
  const tiers = [...typeScale, ...quietTiers];

  it("moves a line by less than the closest two steps of the scale are apart", () => {
    const script = Math.max(
      ...tiers.map((tier) => typeTier("zh-Hans", tier).leading - typeTier("en", tier).leading),
    );

    const closest = Math.min(...pairs().map(([below, above]) => drawnStep(above.gap) - drawnStep(below.gap)));

    // Both halves are real numbers, or the comparison below is vacuous: a probe that
    // measured nothing would report `-Infinity` against `Infinity` and pass forever.
    expect(script).toBeGreaterThan(0);
    expect(Number.isFinite(closest)).toBe(true);

    expect(script).toBeLessThan(closest);
  });
});

/**
 * **The bottom of the page is a landmark distance, and the claim is two utilities deep.**
 *
 * `ScreenBody` writes `p-6 pb-landmark`, which reads as 24px on three sides and 40px at the
 * bottom only because Tailwind emits the `padding` shorthand ahead of the `padding-bottom`
 * longhand. That ordering is the bundler's rather than this app's, it is invisible in the
 * class list, and getting it backwards silently returns the page's last landmark to sitting
 * closer to the bottom bar than two fields of one form sit to each other.
 *
 * The wrapper is reached through the region rather than by class, for the reason
 * `@/test/layout` gives about `column()`: `main` is the one element on a screen this project
 * agrees how to find, and its parent is the padded box by construction.
 */
describe("the page's own edges", () => {
  it("holds a landmark distance at the bottom and the region's padding on the other three", () => {
    const [locale, messages] = locales[0];

    render(
      <Screen locale={locale} messages={messages}>
        {screens(messages)["my work"].body}
      </Screen>,
    );

    const padded = document.querySelector("main")!.parentElement!;
    const style = getComputedStyle(padded);

    // Nothing auto-cleans in this project's setup, and the assertions below read the
    // document: a screen left standing is a screen the next file has to step around.
    const measured = {
      bottom: style.paddingBottom,
      sides: [style.paddingTop, style.paddingLeft, style.paddingRight],
    };

    cleanup();

    expect(Number.parseFloat(measured.bottom)).toBe(drawnStep("gap-landmark"));

    // The other three are one number, whatever it is: `AppHeader` matches this padding so
    // that the two columns agree about where the page's edge is, and
    // `screens.layout.test.tsx` is what holds them to each other. What is pinned here is
    // only that the bottom is the one side that stepped out from the other three.
    expect(new Set(measured.sides).size).toBe(1);
    expect(Number.parseFloat(measured.sides[0])).toBeLessThan(
      Number.parseFloat(measured.bottom),
    );
  });
});

/** Every neighbouring pair of the scale, tighter one first. */
function pairs(): (readonly [(typeof scale)[number], (typeof scale)[number]])[] {
  return scale.slice(0, -1).map((below, index) => [below, scale[index + 1]] as const);
}

/**
 * What one step of the scale really draws, in pixels.
 *
 * Through `row-gap` on a real flex column rather than off the custom property, for the
 * reason `fontStack` in `@/test/layout` gives about the type stack: it is the *computed*
 * value that decides what a reader sees, and a `var()` that fell through to nothing
 * serialises as its own text and would pass a string comparison on a page with no gaps in
 * it at all.
 */
function drawnStep(gap: string): number {
  const box = document.createElement("div");

  box.className = `flex flex-col ${gap}`;
  box.append(document.createElement("span"), document.createElement("span"));
  document.body.append(box);

  const measured = Number.parseFloat(getComputedStyle(box).rowGap);

  box.remove();

  return measured;
}
