/**
 * The site's whole icon vocabulary, drawn rather than depended on — and it is one glyph.
 *
 * It was five, then four, and the three that went were a document, a grid and a bell
 * standing over the three how-it-works columns: icons that illustrated the nouns in the
 * headings rather than telling the reader anything the headings did not. What is left is
 * the one icon that carries information — the tick on the Quote that was chosen — and one
 * glyph is emphatically not a reason for `lucide-react`, a runtime dependency and a
 * version to keep in exchange for a path that fits on one line.
 *
 * Inline anyway, because it is `currentColor` on a surface whose ink changes with the
 * theme. The geometry is the one the set shared: a 24-unit box, `stroke-width` 1.75,
 * round caps and joins, no fill. It is `aria-hidden`, and the cell it sits in carries a
 * visually-hidden *Selected* — an icon that announced itself would make a screen reader
 * read the row twice.
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

/** The tick on the Quote that was chosen, beside a visually-hidden *Selected*. */
export function CheckIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Glyph>
  );
}
