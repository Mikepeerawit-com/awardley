import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { switchLocale } from "@/app/actions/locale";
import { Wordmark } from "@/components/mark";

/**
 * Two rows (#194): what this site is on the left of the first, the three things you can
 * do on the right of it, and the copyright alone under a hairline.
 *
 * The tagline is `site.description`'s sentence again rather than a second one about the
 * product, but it is its own key: a footer line and a `<meta name="description">` are
 * read in different places and will not always want to say the same thing. A reader who has scrolled the whole page arrives here with one question —
 * *what was this, again?* — and the answer is the sentence the page was built to prove.
 *
 * **Sign in is an absolute URL to another host** and therefore a plain `<a>`: `next/link`
 * would prefetch a login screen this site does not own. It is also the one link here
 * that leaves the marketing site, which is why it reads as an ordinary link rather than
 * as a call to action — during the closed beta most people who press it cannot get in,
 * and a button that looks like a way in would be a lie.
 *
 * **The toggle is a real `<form>` posting to a Server Action**, not an `onClick`. It has
 * to work on a page a reader may have reached with JavaScript still in flight, and
 * switching language is precisely the moment somebody decides whether this site is for
 * them. It offers the locale the reader is *not* in, labelled in that language — the
 * label is the affordance, which is why the button says 中文 rather than "Language".
 *
 * Every one of the three is `min-h-11`, because they are tap targets on a phone before
 * they are anything else.
 *
 * Sync rather than `async`, for the reason `HomeContent` gives: an async component is
 * unreachable from the 390px layout suite, and the footer is the widest row on the page.
 */
export function Footer() {
  const t = useTranslations("footer");
  const tSite = useTranslations("site");
  const other = useLocale() === "en" ? "zh-Hans" : "en";

  const link =
    "inline-flex min-h-11 items-center rounded-control text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground";

  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-group md:px-8">
        <div className="flex flex-col gap-group py-field md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-label">
            <Wordmark name={tSite("name")} />
            <p className="max-w-[36ch] text-pretty text-muted-foreground">
              {t("tagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-group gap-y-0">
            <a href="https://app.awardley.com/login" className={link}>
              {t("signIn")}
            </a>

            <Link href="/privacy" className={link}>
              {t("privacy")}
            </Link>

            <form action={switchLocale} className="contents">
              <input type="hidden" name="locale" value={other} />
              <button
                type="submit"
                lang={other}
                aria-label={t("languageLabel")}
                className={link}
              >
                {t("otherLanguage")}
              </button>
            </form>
          </div>
        </div>

        <p className="type-quiet border-t border-border pt-group">
          {t("rights", { year: "2026" })}
        </p>
      </div>
    </footer>
  );
}
