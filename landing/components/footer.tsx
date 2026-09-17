import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { switchLocale } from "@/app/actions/locale";

/**
 * Sign in, Privacy, and the language toggle — the three things #183 puts at the foot of
 * every page.
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
 * Sync rather than `async`, for the reason `HomeContent` gives: an async component is
 * unreachable from the 390px layout suite, and the footer is the widest row on the page.
 */
export function Footer() {
  const t = useTranslations("footer");
  const other = useLocale() === "en" ? "zh-Hans" : "en";

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto w-full max-w-6xl px-5 py-group md:px-8">
        <div className="flex flex-wrap items-center gap-x-group gap-y-field">
          <a
            href="https://app.awardley.com/login"
            className="text-sm font-semibold text-signal-ink hover:underline"
          >
            {t("signIn")}
          </a>

          <Link href="/privacy" className="text-sm hover:underline">
            {t("privacy")}
          </Link>

          <form action={switchLocale} className="contents">
            <input type="hidden" name="locale" value={other} />
            <button
              type="submit"
              lang={other}
              aria-label={t("languageLabel")}
              className="text-sm hover:underline"
            >
              {t("otherLanguage")}
            </button>
          </form>

          <p className="type-quiet ms-auto">{t("rights", { year: "2026" })}</p>
        </div>
      </div>
    </footer>
  );
}
