/**
 * The viewport ADR-0009 states its failure bar at: 390×844, an iPhone 14/15 in CSS
 * pixels.
 *
 * It is its own module, and a `.mts` one, because it has two consumers that cannot share
 * anything heavier: `vitest.config.mts` sets the browser instance to it, and
 * `@/test/layout` names it in every `describe` title. Held in one place, those two cannot
 * drift — a config narrowed to 360 would otherwise leave four suites announcing a width
 * they were no longer measuring at.
 */
export const phone = { width: 390, height: 844 };

/**
 * The browser window the contact sheet is captured in (#78).
 *
 * Vitest scales the test iframe down to fit the window, and a scaled screenshot is a
 * picture of the wrong pixels — 390px of layout reported as 333. So the window is given
 * room for the tallest screen at full size, and the capture asserts it stayed inside.
 *
 * Same reason this lives beside `phone`: `vitest.config.mts` sets it and
 * `screens.contact-sheet.tsx` checks against it, and a number those two disagreed about
 * would silently produce a shrunken sheet rather than an error.
 *
 * It was 3000 until #135 put the comparison working sheet on the Tender detail, which is
 * by a wide margin the tallest screen in the app: at 390px its quote tables are one
 * stacked card per Quote, so the Owner's screen is most of a Tender laid end to end. The
 * number is a window, not a claim — nothing is asserted about how tall a screen may be,
 * only that the tool photographed it at full size rather than scaling it down.
 *
 * It was 6000 until #157 raised `"a tender"` to the five Quotes an Item really carries,
 * which is two more stacked cards on one Item and three on another: the tallest screen —
 * the Tender detail with its folds open, in `en` — went to 6,367px and the assertion
 * below said so, which is what it is for. 8000 is that plus about a quarter, which is the
 * habitual case with room to move and deliberately **not** enough for the growth ADR-0030
 * names as its open risk — eight Quotes apiece would come to roughly 8,100px at the card
 * heights that ADR measures, and this would fail. That is the outcome to want: a window
 * wide enough to swallow it would take the tool quietly past the point where somebody
 * should be looking at the length again.
 */
export const captureWindow = { width: 1200, height: 8000 };
