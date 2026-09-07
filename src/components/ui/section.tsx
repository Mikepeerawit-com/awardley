import type { ReactNode } from "react";

/**
 * One labelled part of a long screen: an anchor, a heading, and the block under it.
 *
 * **The Tender detail had four blocks and two headings between them.** The working sheet
 * and the sourcing list drew no `<h2>` at all, the Outcome panel drew one at
 * `text-lg font-semibold` and the Assignees drew one at `text-sm font-medium` — so the
 * screen had no heading level a reader or a screen reader could navigate by, and the two
 * headings it did have disagreed about what a heading looks like. That is most of what
 * made the screen read as one undifferentiated column: not the colours, the absence of
 * structure between them.
 *
 * So the heading is stated once, here, and every part of that screen is drawn through
 * this. The tier is deliberate and it is the middle one: `text-2xl` is the screen's own
 * `<h1>` in {@link ScreenHeader}, this is `text-base`, and the field labels under it are
 * 10.5px `.field-label`. Three sizes far enough apart to be told apart at arm's length on
 * a phone, which is the thing the old two-size screen could not do.
 *
 * **The `id` is what makes {@link TenderSections} possible**, and it is required rather
 * than optional: a section nobody can link to is one the jump bar silently drops, and a
 * silent drop is the failure ADR-0016 refuses. `scroll-mt` reserves the sticky bar's own
 * height, or a jump lands with the heading underneath the thing that was jumped from.
 *
 * The `aria-labelledby` is what turns a `<section>` into a landmark a screen reader will
 * list. Without an accessible name it is a generic region and is skipped, which would
 * make this markup cost the reader a wrapper and buy them nothing.
 */
export function Section({
  id,
  title,
  action,
  children,
}: {
  /** Stable, and the same string the jump bar links to. */
  id: string;
  title: string;
  /** The one control this part of the screen owns, if it owns one. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="flex min-w-0 scroll-mt-20 flex-col gap-3"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id={headingId}
          className="min-w-0 text-base font-semibold tracking-tight break-words"
        >
          {title}
        </h2>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
