import { cookies, headers } from "next/headers";

import {
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

export async function setLocale(locale: Locale): Promise<void> {
  (await cookies()).set(localeCookieName, locale, {
    maxAge: oneYearInSeconds,
    sameSite: "lax",
    path: "/",
  });
}
