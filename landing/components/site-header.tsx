import Link from "next/link";
import { useTranslations } from "next-intl";

import { Wordmark } from "@/components/mark";

/**
 * The bar every page on this site wears (#194).
 *
 * **It is a header, not a nav.** There is one section to jump to and one thing to do, so
 * there is no menu, no disclosure button and no hamburger — on a phone the bar is the
 * wordmark and the one control, and everything between them is `hidden md:inline-flex`
 * rather than folded into a panel nobody opens.
 *
 * **Sticky because the call to action is at the bottom of a long page.** The ground goes
 * translucent with a blur rather than solid, so a reader scrolling past the hero can see
 * the page continue under it and the bar reads as glass over the page rather than as a
 * second page on top of it.
 *
 * `onHome` is what tells the two anchors whether they are in-page jumps or a trip back
 * to the home page: `#waiting-list` on `/privacy` scrolls to nothing, and a reader who
 * presses *Join the waiting list* from the privacy page must arrive at the form.
 *
 * Sync rather than `async`, for the reason `HomeContent` gives: an async component is
 * unreachable from the 390px layout suite, and this bar is the narrowest row on the page.
 */
export function SiteHeader({ onHome = false }: { onHome?: boolean }) {
  const t = useTranslations();
  const to = (anchor: string) => (onHome ? anchor : `/${anchor}`);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-field px-5 md:px-8">
        <Link href="/" className="shrink-0 rounded-control">
          <Wordmark name={t("site.name")} />
        </Link>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          <a
            href={to("#how")}
            className="hidden min-h-11 items-center rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground md:inline-flex"
          >
            {t("nav.howItWorks")}
          </a>

          {/*
            The only link off this site, and it stays quiet for the reason the footer
            gives: during the closed beta most people who press it cannot get in, and a
            link dressed as a way in would be a lie. A plain `<a>` because `next/link`
            would prefetch a login screen this site does not own.
          */}
          <a
            href="https://app.awardley.com/login"
            className="hidden min-h-11 items-center rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground md:inline-flex"
          >
            {t("footer.signIn")}
          </a>

          <a
            href={to("#waiting-list")}
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-control bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
          >
            {t("hero.cta")}
          </a>
        </div>
      </div>
    </header>
  );
}
