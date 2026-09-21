import "server-only";

import { cache } from "react";

import { isLocale, type Locale } from "@/i18n/config";
import {
  defaultThemeChoice,
  isThemeChoice,
  type ThemeChoice,
} from "@/lib/theme/config";
import { createServiceClient } from "@/lib/supabase/service-client";
import {
  createSessionClient,
  type SessionCookieStore,
} from "@/lib/supabase/session-client";

export type SessionUser = {
  id: string;
  orgId: string;
  name: string;
  email: string;
  locale: Locale | null;
  theme: ThemeChoice;
  isOrgAdmin: boolean;
};

/**
 * `disabled` also covers an auth account with no profile row. The two are different
 * causes and the same situation — the person cannot use the app — and telling them
 * apart at a login form gives whoever is standing there nothing they can act on.
 */
export const signInRefusals = ["invalid", "disabled"] as const;

export type SignInRefusal = (typeof signInRefusals)[number];

export type SignInResult = { ok: true } | { ok: false; reason: SignInRefusal };

/**
 * Everything the login screen can say about why somebody is not in — the refusals above,
 * plus two the sign-in never returns.
 *
 * `incomplete` is the form's own: an empty field is refused before any credential is
 * checked. `link` comes from the URL rather than from an action at all — an invite link
 * that has expired or been used already lands back here with a flag on it, and that is
 * the arrival least able to guess what went wrong.
 *
 * A list rather than a bare union, as every union the app renders a key from is:
 * `messages.test.ts` walks this to hold both locales to it.
 */
export const loginErrors = [...signInRefusals, "incomplete", "link"] as const;

export type LoginError = (typeof loginErrors)[number];

/**
 * The profile, and the Membership that says which org this request is happening in.
 *
 * `org_id` and `is_org_admin` used to be columns on this same row, which was the shape
 * of the old claim that a person belongs to one organisation. They are facts about a
 * **Membership** now, and the embed is how one round trip still answers both halves.
 *
 * **The embed does the scoping, not a filter written here.** `memberships` is read
 * through the session client, so its own policy applies to the embedded rows exactly as
 * it would to a direct read: `org_id = current_org_id()`, the caller's Active Org. Only
 * one Membership can match, because a person holds at most one per org.
 *
 * **`!inner` is what keeps "disabled reads nothing" true.** Without it a caller with no
 * live Membership — Disabled here, or holding several and having chosen none — would come
 * back as a profile row with an empty `memberships` array, and this function would have
 * to invent a sentence about what their org is. With it, no Membership means no row at
 * all, which lands on the `!profile` return below: the same null the RLS-hidden profile
 * row produced before, from the same cause.
 */
const profileColumns =
  "id, name, email, locale, theme, memberships!inner(org_id, is_org_admin)";

export async function signIn(
  credentials: { email: string; password: string },
  store: SessionCookieStore,
): Promise<SignInResult> {
  const supabase = createSessionClient(store);
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error !== null || data.user === null) {
    return { ok: false, reason: "invalid" };
  }

  // Supabase Auth knows nothing about Disabling, so the credentials check passing is not
  // the whole answer. This has to be asked with the service client: RLS hides everything
  // from somebody with no live Membership, their own profile row included, so asking as
  // them cannot distinguish "disabled" from "no such row".
  //
  // Two things can have ended this person's access, and both are read. Disabling in the
  // app ends a Membership, so somebody whose every Membership has ended is Disabled even
  // though their account row says nothing about it. `users.disabled_at` is the account,
  // switched off from the dashboard, and ends everything at once. Somebody holding a live
  // Membership on an account that is not switched off is let through here: whether they
  // then *see* anything is `currentUser`'s question, and a person holding two Memberships
  // who has selected neither is not Disabled, they are undecided.
  const { data: profile } = await createServiceClient()
    .from("users")
    .select("disabled_at, memberships(disabled_at)")
    .eq("id", data.user.id)
    .maybeSingle();

  const holdsLiveMembership =
    profile?.memberships.some(
      (membership: { disabled_at: string | null }) => membership.disabled_at === null,
    ) ?? false;

  if (!profile || profile.disabled_at !== null || !holdsLiveMembership) {
    await supabase.auth.signOut();
    return { ok: false, reason: "disabled" };
  }

  return { ok: true };
}

export async function signOut(store: SessionCookieStore): Promise<void> {
  await createSessionClient(store).auth.signOut();
}

/**
 * Who is asking, or null.
 *
 * The profile is read through the session client rather than the service client on
 * purpose. RLS makes a disabled user read nothing, including their own row, so
 * disabling someone ends their live session on their very next request — they do not
 * keep working until a 30-day cookie expires. The one place that must not use this is
 * the sign-in check above, which needs to tell "disabled" apart from "wrong password".
 *
 * Read **at most once per request**, however many times it is asked for. Two round trips
 * live in here — `getUser()` against the auth server, then the profile row — and one
 * screen asks for them more than once: `(app)/layout.tsx` gates on the answer, and the
 * page beneath it needs the same answer to decide what the caller may do. That was two
 * separate pairs of round trips on every render, for one question with one answer.
 *
 * `cache()` is scoped to a single request, so this can never hand one user another's
 * session. It keys on `store` by reference, which is sound because `cookies()` is itself
 * memoised per request and hands every caller the same object.
 *
 * Outside a render — every test below — React's `cache` is a pass-through that does not
 * memoise at all, so a test that disables a member between two calls still sees the
 * second answer change. Deliberate: the dedupe must not be able to hide that.
 */
export const currentUser = cache(async function currentUser(
  store: SessionCookieStore,
): Promise<SessionUser | null> {
  const supabase = createSessionClient(store);

  // `getUser()`, never `getSession()`: the latter trusts the cookie as sent, while this
  // revalidates it with the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select(profileColumns)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  // An array, because `users` has many `memberships` — and of length one, because the
  // policy on the embedded table answers with the Active Org and nothing else. The guard
  // is not defensive padding: it is the one reading of this query that would otherwise
  // hand every field below an `undefined`, and "no Membership" is already a sentence this
  // function knows how to say.
  //
  // The shape is left to be inferred from the select string rather than written out, for
  // the reason `members.ts` gives at the same point: naming it means writing
  // `is_org_admin` followed by a colon, and `conventions.test.ts` allows exactly one file
  // in the repo to do that — the one where an Org Admin is minted (ADR-0039).
  const [membership] = profile.memberships;

  if (!membership) return null;

  return {
    id: profile.id,
    // The org this request is in — whichever Membership the Active Org selected, rather
    // than a column on the person. Everything downstream that scopes a service-role read
    // by hand is scoping it by this.
    orgId: membership.org_id,
    name: profile.name,
    email: profile.email,
    locale: isLocale(profile.locale) ? profile.locale : null,
    // Unlike `locale` there is no null to carry: the column is `not null default
    // 'system'`, and a value this app does not ship could only come from a database
    // ahead of this build — where following the device is the safe reading.
    theme: isThemeChoice(profile.theme) ? profile.theme : defaultThemeChoice,
    // Read off the Membership, so it is admin *here*: somebody who runs one organisation
    // and is an ordinary member of another gets the invite form in one and not the other,
    // and switching is what changes the answer.
    isOrgAdmin: membership.is_org_admin,
  };
});
