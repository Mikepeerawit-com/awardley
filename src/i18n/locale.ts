import "server-only";

import { cookies, headers } from "next/headers";

import {
  cookieDomainFor,
  defaultLocale,
  isLocale,
  type Locale,
  localeCookieName,
} from "@/i18n/config";

const oneYearInSeconds = 60 * 60 * 24 * 365;

/**
 * The locale this request renders in.
 *
 * Until there is a `users` row to read `locale` from, the cookie is the whole story.
 * When the user row arrives it becomes the source of truth and this falls back to it.
 */
export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(localeCookieName)?.value;
  return isLocale(stored) ? stored : defaultLocale;
}

/**
 * Write the choice down for both hosts, where both hosts are siblings.
 *
 * The `domain` comes off the request rather than out of configuration, because the same
 * build serves `app.awardley.com`, a preview and a laptop, and only the first of the
 * three has a parent domain it may write to. {@link cookieDomainFor} holds that rule;
 * `undefined` means host-only, which is what `cookies().set` does with no `domain` — and
 * is what this did everywhere before the marketing site existed.
 */
export async function setLocale(locale: Locale): Promise<void> {
  const domain = cookieDomainFor((await headers()).get("host"));

  // Anyone who used the app before this change still holds a host-only `NEXT_LOCALE`
  // written by the older version of this function, and a host-only cookie is a *different*
  // cookie from the parent-domain one — same name, both sent. It cannot be expired here:
  // `cookies()` keys its pending writes by name alone, so a `delete` followed by a `set`
  // of `NEXT_LOCALE` collapses into the single `Set-Cookie` the `set` asked for, and the
  // response has no room for the other. It does not have to be. RFC 6265 §5.4 sends the
  // equal-path pair oldest first, an overwrite keeps a cookie's original creation time,
  // and the host-only one predates this deployment — so it is always sent first and the
  // parent-domain one always last, which is the one `cookies().get` hands back. The stale
  // cookie is shadowed rather than shadowing, and ages out on its own.
  (await cookies()).set(localeCookieName, locale, {
    maxAge: oneYearInSeconds,
    sameSite: "lax",
    path: "/",
    ...(domain === undefined ? {} : { domain }),
  });
}
