import "server-only";

import { cookies, headers } from "next/headers";

import {
  cookieDomainFor,
  isLocale,
  type Locale,
  localeCookieName,
  localeFromAcceptLanguage,
} from "@/i18n/config";

const oneYearInSeconds = 60 * 60 * 24 * 365;

/**
 * The locale this request renders in: what the reader chose if they chose, otherwise
 * what their browser asked for.
 *
 * Reading a header makes every page here dynamic, which on a four-part marketing page is
 * the trade this locale rule costs. It is paid deliberately: the alternative is to
 * prerender English and correct it after hydration, which is a flash of the wrong
 * language on exactly the connection — a phone, in China — where it lasts longest.
 */
export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(localeCookieName)?.value;

  if (isLocale(stored)) return stored;

  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

/**
 * Write the reader's choice down, for both hosts where both hosts are siblings.
 *
 * The `domain` is read off the request rather than configured, because the same build
 * serves `awardley.com`, a preview and a laptop, and only the first of the three has a
 * parent domain it may write to. {@link cookieDomainFor} holds that rule; `undefined`
 * here means "host-only", which is what `cookies().set` does with an absent `domain`.
 */
export async function setLocale(locale: Locale): Promise<void> {
  const domain = cookieDomainFor((await headers()).get("host"));

  (await cookies()).set(localeCookieName, locale, {
    maxAge: oneYearInSeconds,
    sameSite: "lax",
    path: "/",
    ...(domain === undefined ? {} : { domain }),
  });
}
