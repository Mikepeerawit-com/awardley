import { expect } from "vitest";

export { phone } from "./phone.mjs";

/**
 * The app's `src/test/layout.ts`, cut to the two things this site's one layout suite
 * needs. Copied rather than imported: `landing/` is a separate package with a separate
 * deployment, and a relative import climbing out of it would make this build depend on a
 * directory the Vercel project does not contain.
 */

export function expectNoSidewaysScroll(): void {
  expect(overflowing(document.body)).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth,
  );
}

/**
 * Every element whose content is wider than the box drawn for it, named well enough that
 * a failure says which one — the app learned that the hard way in #56, where the shell's
 * header overflowed on every screen and the failure named nothing.
 *
 * Elements that clip on purpose are excluded, as are the form controls, whose
 * `scrollWidth` reports the text a reader has typed rather than the layout.
 */
export function overflowing(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLElement>("*")]
    .filter((element) => element.closest(".sr-only") === null)
    .filter((element) => !["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName))
    .filter((element) => !clipsHorizontally(element))
    .filter((element) => element.scrollWidth > element.clientWidth)
    .map(describeBox);
}

function clipsHorizontally(element: HTMLElement): boolean {
  return ["hidden", "clip"].includes(getComputedStyle(element).overflowX);
}

function describeBox(element: Element): string {
  const text = (element.textContent ?? "").trim().slice(0, 40);

  // `getAttribute`, not `className`: on an SVG that property is an `SVGAnimatedString`
  // and stringifies to nothing anybody can search for.
  return `${element.tagName.toLowerCase()}.${element.getAttribute("class")} — "${text}"`;
}

export function drawn(element: HTMLElement | undefined | null): boolean {
  return element != null && element.checkVisibility();
}
