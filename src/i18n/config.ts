/**
 * The two locales the app ships. Both are complete at launch — a switcher over
 * half-translated strings sends the first person who flips it to raw keys.
 */
export const locales = ["en", "zh-Hans"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * Where the chosen locale is remembered until there is a `users` row to hold it.
 * The locale is deliberately not in the URL: reminder deep links posted into WeCom
 * should not have to encode one, and the user row is the source of truth.
 */
export const localeCookieName = "NEXT_LOCALE";

/** The parent the app and the marketing site are both under. */
const siteDomain = "awardley.com";

/**
 * The `domain` the locale cookie is written for, decided from the host that asked.
 *
 * On `awardley.com` and anything under it the answer is `.awardley.com`, so that one
 * choice holds on both hosts. Anywhere else — `localhost`, a `*.vercel.app` preview —
 * the answer is nothing at all: a browser drops a cookie whose `domain` is not a parent
 * of the host setting it, so naming one there would not widen the cookie, it would lose
 * it, and the switcher would silently stop working everywhere but production.
 *
 * The port is cut off first, because `localhost:3000` is a `Host` header and not a
 * hostname.
 *
 * The marketing site carries a twin of this function in `landing/i18n/config.ts`. That
 * is deliberate: ADR-0035 has the two packages share no code, and a rule this small is
 * cheaper duplicated than it would be behind a shared package the site does not
 * otherwise need. The pair is held together by the tests on either side, not by an
 * import.
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
