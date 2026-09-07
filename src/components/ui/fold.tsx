import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A block the reader can put away: a heading that is also the control, and the block
 * under it.
 *
 * **Why the Tender detail needed one.** That screen was 4786px tall on a 390px phone —
 * five and a half screenfuls of unbroken scroll — and most of what made it that long is
 * read **once, or never**: who owns the Tender, the day it arrived, the notes somebody
 * typed when they recorded it, the list of Assignees. None of it is wrong to have on the
 * screen and all of it was in front of the one thing the screen is *for*, which is the
 * Items and what they cost.
 *
 * So the rule this component encodes is: **a block that answers a question the reader
 * did not arrive with goes behind a fold.** What they arrived with — what do I owe, what
 * do these Items cost, when is this due — never does.
 *
 * **`<details>` rather than state**, and that is the whole reason this is a Server
 * Component with no `"use client"` at the top. The browser opens and closes it, so it
 * works before hydration and inside the WeCom webview on a phone network, which is the
 * slowest path in the product (ADR-0024's reasoning about the theme applies to every
 * control on that path). It is also keyboard-operable and announced as a disclosure with
 * nothing written here to make it so — `aria-expanded` is the browser's to maintain, and
 * a hand-rolled button plus `useState` would be three more things to get wrong.
 *
 * **Open is a prop rather than a memory.** {@link ItemDisclosure} derives its openness
 * from whether the Item still needs work, and this follows the same posture for the same
 * reason: the screen should open showing the work that is left, not showing whatever the
 * reader happened to poke at last week. `defaultOpen` is the caller's reading of that,
 * and nothing here persists a thing.
 *
 * **The summary clears the 44px floor** (`buildspec_2`), which is what `min-h-11` is for
 * on a control whose text is 13px — and it is stated as a minimum height rather than as
 * padding, because these headings are two Han glyphs in `zh-Hans` and several words in
 * `en`, and a target sized by its text clears the floor in one language and misses it in
 * the other. `target.layout.test.tsx` caught exactly that on the reduce bar.
 *
 * The marker is removed in both spellings — `list-style` for every engine that follows
 * the standard, and `::-webkit-details-marker` for the Safari that does not — because a
 * native triangle beside the chevron below is the same claim made twice in two
 * typefaces.
 */
export function Fold({
  id,
  title,
  count,
  level = 2,
  defaultOpen = false,
  children,
}: {
  /**
   * Stable, and the same string {@link TenderSections} links to.
   *
   * **A jump to a shut fold scrolls it into view and leaves it shut**, which is the
   * browser's own behaviour and is left alone deliberately. There is no markup that opens
   * a `<details>` from a fragment — `:target` can style it and cannot open it — so the
   * alternatives are a script, which would cost this component its whole reason for being
   * server-rendered, or opening every fold by default, which would put the scroll back.
   * Landing on the fold with its heading at the top of the viewport is one tap from what
   * the reader asked for, and the tap is the same one they would have made had they
   * scrolled there.
   */
  id?: string;
  /** What is behind the fold, in the words the reader would use for it. */
  title: string;
  /**
   * How many things are in there, when that is a number worth knowing before opening —
   * three Assignees, two unplaced pictures. Omitted where the block is not a list, since
   * a "1" beside a block of facts says nothing.
   */
  count?: number;
  /**
   * Which heading the summary is, and the only reason this is a prop: a fold nested
   * inside a {@link Section} that already drew an `<h2>` is a level down from one sitting
   * beside it, and a document whose levels skip is one a screen reader's heading list
   * misreports. The look is the same either way — the tier is the outline's, not the
   * type scale's.
   */
  level?: 2 | 3;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const Heading = level === 3 ? "h3" : "h2";

  return (
    <details
      id={id}
      open={defaultOpen}
      className="group border-hairline bg-card min-w-0 scroll-mt-20 overflow-hidden rounded-xl border"
    >
      <summary className="hover:bg-muted/50 flex min-h-11 min-w-0 cursor-pointer list-none items-center gap-2.5 px-4 py-2.5 transition-colors [&::-webkit-details-marker]:hidden">
        <ChevronDown
          aria-hidden="true"
          className="text-ink-faint size-4 shrink-0 -rotate-90 transition-transform group-open:rotate-0"
        />
        <Heading className="min-w-0 text-[13px] font-semibold break-words">{title}</Heading>
        {count !== undefined && (
          <span className="text-ink-faint ml-auto shrink-0 font-mono text-[13px] font-medium tabular-nums">
            {count}
          </span>
        )}
      </summary>
      {/* The border rather than a gap, so a fold reads as one object whether it is open
          or shut — a shut one is a bar, an open one is a bar with a drawer under it. */}
      <div className="border-hairline-soft min-w-0 border-t p-4">
        {children}
      </div>
    </details>
  );
}
