import { useTranslations } from "next-intl";

/**
 * The way around a screen too long to scroll: one link per part, pinned to the top.
 *
 * **Why this exists, measured.** The Tender detail is the longest screen in the app by a
 * wide margin — 4786px at 390px, against 1100px for the tender list and 844px for My
 * work — and it is the screen a reader arrives at with a *specific* question: which quote
 * do I pick for the second Item, or when did this go out, or who is on it. Before this
 * there was one way to answer any of them, and it was to thumb past everything else.
 *
 * **The links are the section headings, not a second set of names for them.** Each entry
 * carries the message key its {@link Section} draws, so a part of the screen cannot end
 * up called one thing on the bar and another on the heading it leads to — the failure
 * `app-nav.tsx` sets out at length for the app's two destinations, and the thing
 * `CONTEXT.md` exists to prevent. Renaming a section renames its link, with nothing here
 * to keep in step.
 *
 * **Which sections exist is the page's answer, not this component's.** The Outcome panel
 * is the Owner's alone (ADR-0020) and the unassigned pictures are drawn only when there
 * are some, so a bar that assumed the full set would link to two anchors that are not on
 * the page for most readers. It is handed the list it is to draw.
 *
 * **A `Fold` is never in that list**, and the one-line rule is: a jump link is worth a row
 * of the screen only where there is a scroll to save, and there is none to save on a bar
 * that is 44px whether it is open or shut. `density.layout.test.tsx` put a number on the
 * alternative — listing the two folds took the Assignee's Tender detail from 8 control
 * rows to 10 in `en` — which is a navigation control added to a screen with no distance in
 * it. That is also what the guard below is really enforcing: with only the Sections
 * counted, the Owner's 4786px screen has two or three and gets a bar, and the Assignee's
 * 1932px screen has one and does not.
 *
 * **`sticky top-0` and not `fixed`**, for the reason `BottomNav` gives: sticky keeps its
 * own slot in the document, so nothing below has to reserve room for it. It costs the
 * reader nothing that was not already gone — {@link AppHeader} does not stick, so by the
 * time this is holding the top of the viewport the bar it is covering has scrolled away.
 *
 * **It stays inside the region rather than bleeding to the window's edge** (ADR-0022).
 * The full-bleed version of this bar is one `-mx-6` away and was written and taken out
 * again: `ScreenBody` puts the region's padding on the parent, so pulling back by it
 * makes this element wider than the one containing it — which is exactly what
 * `overflowing` in `@/test/layout` is watching for, and the same trade `app-header.tsx`
 * refused for the sake of eight pixels of ghost-button inset. So it is drawn as a bar
 * that floats *in* the column rather than a strip behind it, which is a shape that owes
 * the guard nothing.
 *
 * **`flex-wrap`, so that the one-row guard can fail.** A bar that cannot wrap holds
 * itself on one line whatever it is given and pushes the page sideways instead, which is
 * a different fault caught by a different assertion. Allowed to wrap, a set that has
 * outgrown 390px gets taller — which is what `screens.layout.test.tsx` measures. Five
 * links fit today in both scripts; that is the claim being pinned, not a shape being
 * permitted.
 *
 * **A plain `<a>`, deliberately.** These are same-document fragments and `next/link`
 * would route them, which on a dynamic screen means a server round trip to arrive at a
 * place already on screen. The browser's own anchor scroll is instant, works before
 * hydration, and honours `prefers-reduced-motion` because nothing here sets
 * `scroll-behavior: smooth` — the global rule in `globals.css` would strip it anyway.
 *
 * Each link clears the 44px floor as a stated `min-h-11`/`min-w-11` rather than through
 * padding, because these labels are two Han glyphs in `zh-Hans` and two or three words in
 * `en`: a target sized by its text clears the floor in one language and misses it in the
 * other.
 */
export function TenderSections({ sections }: { sections: TenderSectionLink[] }) {
  const t = useTranslations();

  // One link is not a way around a screen, it is a label for the only place you can be.
  // Two is the point at which jumping beats scrolling.
  if (sections.length < 2) return null;

  return (
    <nav
      aria-label={t("tenders.sections.jump")}
      className="border-hairline bg-card/95 supports-[backdrop-filter]:bg-card/80 sticky top-2 z-30 flex min-w-0 flex-wrap items-center gap-1 rounded-xl border px-1.5 py-1 shadow-sm backdrop-blur"
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-[13px] font-medium break-words transition-colors"
        >
          {t(section.label)}
        </a>
      ))}
    </nav>
  );
}

/**
 * One part of the Tender detail: the anchor it sits on, and the key that names it.
 *
 * The key rather than the string, so the bar and the heading read the same message and
 * the page composing both hands each of them the same entry.
 */
export type TenderSectionLink = {
  id: string;
  label: string;
};
