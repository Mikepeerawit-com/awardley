/**
 * The two locales the site ships, the same pair and the same names as the app.
 * No Thai: #183 puts it out of scope, and a switcher over half-translated strings
 * sends the first person who flips it to raw keys.
 */
export const locales = ["en", "zh-Hans"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * The same cookie name the app uses, so that a reader who picked 中文 here and then
 * followed **Sign in** does not have to pick it again — the two hosts are siblings under
 * `awardley.com` and a cookie written for the parent domain is read by both. Writing it
 * for the parent is {@link cookieDomainFor}'s job, and without that the sentence above
 * would simply be false.
 *
 * It travels both ways. The app's switcher writes the same parent-domain cookie, so
 * whichever toggle was used last is the language on both hosts — there is one choice
 * here, not one per host.
 *
 * The locale is deliberately not in the URL. The app made that choice so reminder deep
 * links need not encode one; the site inherits it so that `awardley.com/privacy` is one
 * address rather than three.
 */
export const localeCookieName = "NEXT_LOCALE";

/** The parent the site and the app are both under, and the only host pair worth sharing with. */
const siteDomain = "awardley.com";

/**
 * The `domain` the locale cookie is written for, decided from the host that asked.
 *
 * On `awardley.com` and anything under it the answer is `.awardley.com`, which is what
 * lets `app.awardley.com` read a choice made here. Anywhere else — `localhost`, a
 * `*.vercel.app` preview — the answer is nothing at all: a browser refuses a `domain`
 * that is not a parent of the host setting it, so naming one there would not widen the
 * cookie, it would drop it, and the footer toggle would silently stop working on every
 * preview deployment.
 *
 * The port is cut off first, because `localhost:3000` is a `Host` header and not a
 * hostname.
 */
export function cookieDomainFor(host: string | null): string | undefined {
  if (host === null) return undefined;

  const hostname = host.split(":")[0].trim().toLowerCase();

  if (hostname === siteDomain || hostname.endsWith(`.${siteDomain}`)) {
    return `.${siteDomain}`;
  }

  return undefined;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

/**
 * The browser's own answer, which is what the site leads with.
 *
 * The *app* asks rather than infers — a colleague in China and one in Bangkok would
 * otherwise silently get different apps, and the one who got the wrong guess has no
 * reason to think there is a switch. A marketing page cannot ask: an interstitial
 * between a link and the page it promised is how a visitor leaves. So it guesses, and
 * puts the switch in the footer where the guess can be corrected.
 *
 * Any Chinese tag written in simplified script counts — `zh`, `zh-CN`, `zh-Hans-SG`,
 * `zh-SG`. Traditional-script regions (`zh-TW`, `zh-HK`, `zh-MO`) and an explicit
 * `zh-Hant` do not: the copy is simplified, and serving it to a Taiwanese reader as
 * though it were theirs is worse than serving English.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (header === null) return defaultLocale;

  for (const tag of preferenceOrder(header)) {
    if (tag === "en" || tag.startsWith("en-")) return "en";
    if (isSimplifiedChinese(tag)) return "zh-Hans";
  }

  return defaultLocale;
}

function preferenceOrder(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => /^\s*q=([0-9.]+)\s*$/.exec(parameter))
        .find((match) => match !== null);

      return { tag: tag.trim().toLowerCase(), q: quality ? Number(quality[1]) : 1 };
    })
    .filter((entry) => entry.tag !== "" && entry.tag !== "*" && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}

function isSimplifiedChinese(tag: string): boolean {
  if (tag !== "zh" && !tag.startsWith("zh-")) return false;

  const subtags = tag.split("-");

  if (subtags.includes("hant")) return false;

  // A region that writes traditional, with no script subtag to say otherwise.
  return !subtags.some((subtag) => ["tw", "hk", "mo"].includes(subtag));
}
