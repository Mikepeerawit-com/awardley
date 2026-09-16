/**
 * The three-bar mark, redrawn as inline SVG from `.scratch/tender-tracker-mvp/app-logo.png`.
 *
 * Three stacked bars of descending width — roughly 7 : 5 : 4 — left-aligned, fully
 * rounded ends, on a 24-unit square. It reads as a list getting shorter, which is the
 * one thing this app does to a pile of Quotes.
 *
 * **Inline rather than a file**, because the middle bar has to change colour with the
 * theme. The source artwork is sky blue over near-white over grey on a dark navy ground;
 * a near-white bar on the light theme's warm paper is an invisible bar, so light inverts
 * that one to ink and leaves the other two where they are. The values live in
 * `globals.css` as `--mark-1..3` so both themes are stated in the one place every other
 * colour in this site is stated.
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

/** The mark and the wordmark, which never appear apart. Fira Sans is the whole brand. */
export function Wordmark({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark className="h-6 w-6 shrink-0" />
      <span className="text-[1.15rem] font-bold tracking-[-0.015em]">{name}</span>
    </span>
  );
}
