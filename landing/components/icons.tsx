/**
 * The site's whole icon vocabulary, drawn rather than depended on.
 *
 * Five glyphs is not a library. `lucide-react` would be a runtime dependency, a bundle
 * and a version to keep, in exchange for paths that fit on one screen — and these have
 * to be inline anyway, because every one of them is `currentColor` on a surface whose
 * ink changes with the theme and, in the closed-beta band, does not.
 *
 * All of them share the one geometry: a 24-unit box, `stroke-width` 1.75, round caps and
 * joins, no fill. They are `aria-hidden` without exception — each sits beside the words
 * it illustrates, and an icon that announced itself would make a screen reader read the
 * line twice.
 */
function Glyph({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** A Tender: a sheet of paper with the Items listed down it. */
export function DocumentIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </Glyph>
  );
}

/** The comparison sheet: one column per supplier, one row per Item. */
export function SheetIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 9v11" />
      <path d="M15 9v11" />
    </Glyph>
  );
}

/** A Reminder, which arrives in one person's inbox rather than in a group chat. */
export function BellIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-2 6h16c-.5-.5-2-2-2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Glyph>
  );
}

/** A fact that is already true, rather than a promise. */
export function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Glyph>
  );
}

/** The bare tick, for a list that has already drawn its own bullets. */
export function CheckIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Glyph>
  );
}
