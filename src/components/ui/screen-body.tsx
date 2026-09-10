import type { CSSProperties, ReactNode } from "react";

/**
 * How wide the **measure** is on this screen — the narrower column that form fields and
 * prose sit in, inside the region.
 *
 * A length rather than a Tailwind class, because it is set once per screen and read by
 * every {@link Measure} inside it through a custom property; a class can only cap the
 * element it is written on. The two values are the two the app really uses:
 *
 * - `48rem` — **768px**, a line of prose and the column the forms are laid out in. It is
 *   also the width the Assignee's screens were composed at before ADR-0022, so the quote
 *   form is unchanged rather than merely unbroken.
 * - `42rem` — **672px**, for a screen that is a short form and nothing else. The three
 *   Org Admin screens are the ones that are.
 *
 * They are caps, not widths: on a phone the measure is the whole column, which is why one
 * design carries both devices rather than two.
 */
export type MeasureWidth = "48rem" | "42rem";

/**
 * The wrapper a screen's body is drawn inside: a padded full-height box, and **the
 * region** within it — one column, at the desk's width, on every screen behind the login.
 *
 * Split out from `Screen` rather than living inside it, because two screens draw this
 * wrapper *without* the app bar above it — `ScreenSkeleton` and `ScreenError`, which
 * stand in for a page and so have their bar drawn by `(app)/loading.tsx` and
 * `(app)/error.tsx` instead (#73). `ScreenError` is also a Client Component, and `Screen`
 * reaches for the session, so it could not import from there at all.
 *
 * **The width is no longer the seam; the measure is** (ADR-0022, #131). Until this ticket
 * each screen committed to its own cap and handed it in as a prop, and the page's left
 * edge therefore moved when the reader changed screen. The region is now the same number
 * everywhere and is stated here alone. What a screen still varies is how wide a line of
 * its prose and its fields are allowed to be, and that is `measure` — declared once here
 * and inherited by every {@link Measure} on the screen, so that one screen cannot end up
 * with two answers.
 *
 * **The same region reaches the bar**, which is what makes the two agree about where the
 * page's edge is. `AppHeader` caps its own inner column at the same `max-w-7xl` and the
 * `p-6` below is the padding that bar matches — change one and the other has to move with
 * it, which is why `screens.layout.test.tsx` measures the two columns against each other
 * rather than trusting that they were kept in step.
 *
 * **The cap and the padding are on different elements**, and that is not incidental: a
 * `max-w-*` sizes the border box, so a column carrying its own padding would be capped
 * *including* it and would land exactly one padding inside the other (ADR-0021's #97
 * amendment). The outer `div` carried an inert `gap-8` for as long as this wrapper has
 * existed — it has one child — and it went with #154, which is also where its `pb`
 * stopped matching the other three sides: **the bottom of the page is a landmark
 * distance**, and 24px of it was the last thing on a screen sitting closer to the bottom
 * bar than two fields of one form sit to each other.
 *
 * **The rhythm between the region's children is `gap-landmark`, and no screen sets its
 * own any more** (#154). Every one of those children is a landmark in the accessibility
 * tree — the screen's `header`, the jump `nav`, each `Section` — so 40px is the distance
 * the spacing scale reserves for the boundary a reader is most likely to be looking for.
 * It used to be `gap-8` with a `gap-6` a single screen handed in, which is the fault that
 * ticket was raised about arriving one layer up: a scale whose steps mean nothing invites
 * every call site to pick its own, and one page choosing its own region rhythm is exactly
 * that. `ScreenGap` and the prop that carried it are gone.
 */
export function ScreenBody({
  measure = "48rem",
  children,
}: {
  measure?: MeasureWidth;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col p-6 pb-landmark">
      <main
        style={{ "--measure": measure } as CSSProperties}
        className="mx-auto flex w-full max-w-7xl flex-col gap-landmark"
      >
        {children}
      </main>
    </div>
  );
}

/**
 * The narrower column inside the region, for the things nobody wants a monitor's width of.
 *
 * Prose and form fields, and only those. Headings, lists, tables and sub-navigation span
 * the region — they are scanned rather than read along, and a table narrowed to a line of
 * prose is a table with columns taken off it. A text input is the clearest case in the
 * other direction: one grown to 1280px is a metre of tracking to type a client's name into
 * (#129, story 4).
 *
 * **Its default rhythm is the group step** (#154): what usually sits in a measure is two
 * or three blocks about different things — a Language card and an Appearance card, a form
 * and the sentence that qualifies it — and 24px is the distance the scale gives that
 * boundary. It was `gap-4`, the same 16px two fields of one form sat at, which is why a
 * screen made of cards read as one column of them. A caller that is laying out something
 * else still says so, the way `ScreenHeader` does.
 *
 * **It reads the screen's measure rather than taking one.** The width comes from
 * `--measure`, set once by {@link ScreenBody} and inherited, so a screen has a single
 * answer no matter how many of these it draws. Handing each one its own width is what
 * would let a header and the form beneath it disagree — and `48rem` is the fallback for
 * the one place with no `ScreenBody` above it, the signed-out screens' own `main`.
 *
 * **`data-measure` is the seam the layout suite measures**, and it is on the element for
 * that reason. There is no role, no tag and no accessible name that says "this is the
 * column the prose is in" — it is a layout fact and nothing else — so the alternative is a
 * class-name selector, which is the implementation rather than the thing, or sampling
 * widths and guessing which was meant.
 */
export function Measure({
  className = "flex flex-col gap-group",
  children,
}: {
  /**
   * How the column lays its own children out. The cap is this component's; everything
   * else about the block is the caller's, the way it was before it was wrapped.
   */
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-measure className={`w-full max-w-[var(--measure,48rem)] ${className}`}>
      {children}
    </div>
  );
}
