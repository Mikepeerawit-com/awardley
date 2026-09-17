/**
 * The three-bar mark, redrawn as inline SVG from `.scratch/tender-tracker-mvp/app-logo.png`.
 *
 * Three stacked bars of descending width — roughly 7 : 5 : 4 — left-aligned, fully
 * rounded ends, on a 24-unit square. It reads as a list getting shorter, which is the
 * one thing this app does to a pile of Quotes.
 *
 * **Inline rather than a file**, because the middle bar has to change colour with the
 * theme: it is the page's ink, and ink on a near-black ground is the opposite of ink on
 * white. The three bars are the accent, the ink and the muted ink — `--mark-1..3` in
 * `globals.css`, aliases onto the palette rather than three more colours, so the mark
 * cannot drift away from the page it sits on.
 *
 * `app/icon.svg` is the same geometry with the values written out, since a favicon is
 * fetched without a stylesheet.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="5" width="20" height="3.6" rx="1.8" fill="var(--mark-1)" />
      <rect x="2" y="10.2" width="14.3" height="3.6" rx="1.8" fill="var(--mark-2)" />
      <rect x="2" y="15.4" width="11.4" height="3.6" rx="1.8" fill="var(--mark-3)" />
    </svg>
  );
}

/**
 * The mark and the wordmark, which never appear apart. The name is set in the one face
 * this site loads — Inter — at 600, the same weight as every heading on the page: the
 * display line is bigger than this, not heavier than it, so a wordmark at 700 would be
 * the boldest thing on a page whose headline is supposed to be.
 */
export function Wordmark({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark className="h-6 w-6 shrink-0" />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.015em]">{name}</span>
    </span>
  );
}
