import "server-only";

import { timingSafeEqual } from "node:crypto";

import { isConvertibleCurrency } from "@/lib/fx/currencies";
import { createServiceClient } from "@/lib/supabase/service-client";

/**
 * How an organisation comes into existence.
 *
 * One person, one form, and a new organisation with nothing in it and them as its first
 * Org Admin. Every other Membership is created by an Invite from an Org Admin of the
 * organisation being joined, and **nothing here can ever join an existing one** — there
 * is no org id on the form, no lookup by name, and no branch that reads `orgs` before it
 * writes. Signing up into somebody else's organisation is the bug the glossary's Invite
 * entry exists to prevent: inside an org RLS lets a member read every supplier's price
 * and every Margin, so a self-selected "join" is not a limited account, it is the
 * business. Creating an empty organisation is safe for the same reason joining one is
 * not: there is nothing in it yet (ADR-0039, and ADR-0017's amendment before it).
 *
 * This is the *only* thing in the codebase that writes `is_org_admin = true`, which
 * `conventions.test.ts` holds it to. The guarded `/setup` screen used to be that place;
 * its whole purpose was closing the "the first account cannot invite itself" gap for a
 * single seeded organisation, and this closes it for every organisation instead.
 *
 * ## The gate
 *
 * The app launches as a closed beta: only an invited client may use it, and everyone
 * else joins the waiting list on the landing page. So the form asks for a **Beta Code**,
 * held on the deployment as `SIGNUP_CODE`, in exactly the posture `SETUP_SECRET` had:
 *
 *   * **Unset means closed.** A deployment that forgets the variable gets a shut door
 *     rather than an open one, which is the only safe direction for that mistake to
 *     fail in — and every preview deployment shares production's database.
 *   * **Checked before anything reaches the database.** Somebody without the code
 *     cannot drive service-role queries on a public route, and cannot learn whether an
 *     address already has an account.
 *
 * The code is one shared string handed to each invited client, not a per-client token.
 * That is deliberate and it is worth saying what it buys and does not buy. It is *not*
 * org isolation — a stranger who somehow holds it gets an empty organisation of their
 * own and nothing of anybody else's, because the grant on `orgs` and the policy on
 * `memberships` are what keep them out, not this string. What it is is the beta's
 * guest list, rotated by changing the variable and redeploying. Open self-serve signup,
 * when it comes, is the removal of this check and nothing else.
 */

export const signupRefusals = [
  "closed",
  "wrong_code",
  "unknown_currency",
  "email_taken",
  "create_failed",
] as const;

export type SignupRefusal = (typeof signupRefusals)[number];

/**
 * Everything the signup screen can say, including the four refusals the form makes
 * before any of this is reached. `messages.test.ts` walks this so a reason cannot ship
 * without a sentence — and this is a screen nobody is signed in behind, so a raw message
 * key here leaves the reader with no app to retreat into.
 */
export const signupErrors = [...signupRefusals, "incomplete", "too_short", "mismatch"] as const;

export type SignupError = (typeof signupErrors)[number];

export type SignupResult =
  | { ok: true; userId: string; orgId: string }
  | { ok: false; reason: SignupRefusal };

/**
 * Whether the door is open at all — the one condition `signUp` enforces before touching
 * anything, asked ahead of time so the page can render a closed notice instead of a form
 * nobody can submit.
 *
 * This is not a security boundary and is not treated as one: it decides what to draw.
 * The refusal that matters is made below, at the write.
 */
export function signupIsOpen(): boolean {
  return configuredCode() !== null;
}

/**
 * Create an organisation and its first Org Admin, or say why not.
 *
 * The four writes happen in the order that makes the likely refusal the cheap one. The
 * auth account goes first because "that address already has an account" is the one
 * failure a real person will hit, and refusing it before an `orgs` row exists means
 * there is nothing to undo. Each later failure undoes everything before it, so the
 * database is left holding either all four rows or none: an organisation with no
 * Membership is a row nobody could ever reach, and a profile with no Membership is an
 * account that can hold a password and read nothing.
 *
 * `email_confirm` is set for the reason `/setup` set it: the person typed the address and
 * the password into the same form, so a confirmation round trip would prove ownership of
 * the address and nothing else — and during the beta the Beta Code has already been
 * handed to a known person. It is named in ADR-0039 as the trade it is.
 */
export async function signUp({
  email,
  name,
  password,
  organisation,
  reportingCurrency,
  code,
}: {
  email: string;
  name: string;
  password: string;
  organisation: string;
  reportingCurrency: string;
  code: string;
}): Promise<SignupResult> {
  const expected = configuredCode();

  if (!expected) return { ok: false, reason: "closed" };

  if (!codeMatches(code, expected)) return { ok: false, reason: "wrong_code" };

  // Refused here rather than only in the form, because this is the write that stamps
  // every Tender the organisation will ever open: a currency ECB publishes no rate for is
  // one nothing could ever convert a foreign Quote into. The picker offers only this
  // list, so reaching this is a hand-built request — and still a cheap refusal, made
  // before anything touches the database.
  if (!isConvertibleCurrency(reportingCurrency)) {
    return { ok: false, reason: "unknown_currency" };
  }

  const service = createServiceClient();

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error !== null || !data.user) {
    // Supabase reports an already-registered address as a create failure. Tell them
    // apart, because "sign in instead" needs no server log and a real failure does.
    // `invite.ts` reads the same two signals.
    const taken =
      error?.code === "email_exists" ||
      (error?.message.includes("already been registered") ?? false);

    return { ok: false, reason: taken ? "email_taken" : "create_failed" };
  }

  const userId = data.user.id;

  // The organisation, created and never looked up. Its name is whatever the person
  // typed and is not unique: two organisations called the same thing are two
  // organisations, which is the point.
  //
  // The Reporting Currency is written from the form rather than left to the column's
  // default. That default exists to have backfilled the first organisation's row; a new
  // customer inheriting it is the bug ADR-0036 was written to remove, and this is the
  // screen the column comment says must ask. The timezone is *not* asked yet and does
  // fall to its default, which ADR-0039 names as the gap it is.
  const { data: org, error: orgError } = await service
    .from("orgs")
    .insert({ name: organisation, reporting_currency: reportingCurrency })
    .select("id")
    .single();

  if (orgError !== null || !org) {
    await service.auth.admin.deleteUser(userId);

    return { ok: false, reason: "create_failed" };
  }

  const { error: profileError } = await service.from("users").insert({
    id: userId,
    name,
    email,
    // The Active Org, defaulted to the one org this person is about to hold a place in
    // (ADR-0037). The writer that creates a person's first Membership says which org
    // they are looking at, and the switcher in `active-org.ts` is the only thing that
    // ever changes it.
    active_org_id: org.id,
    // `locale` is left null for the same reason an invited colleague's is: first
    // start-up asks rather than inferring.
  });

  if (profileError) {
    await service.from("orgs").delete().eq("id", org.id);
    await service.auth.admin.deleteUser(userId);

    return { ok: false, reason: "create_failed" };
  }

  // The Membership is the write that mints the Org Admin: `is_org_admin` is a property
  // of a person's place in one organisation, not of the person (CONTEXT.md, **Org
  // Admin**), and this is the one file allowed to spell the column with a colon.
  //
  // The undo reaches all three rows. `users.active_org_id` points at the org, so the
  // profile goes before the org does; `memberships.user_id` is `on delete cascade`, so
  // nothing this insert managed to write outlives the profile row.
  const { error: membershipError } = await service.from("memberships").insert({
    user_id: userId,
    org_id: org.id,
    is_org_admin: true,
  });

  if (membershipError) {
    await service.from("users").delete().eq("id", userId);
    await service.from("orgs").delete().eq("id", org.id);
    await service.auth.admin.deleteUser(userId);

    return { ok: false, reason: "create_failed" };
  }

  return { ok: true, userId, orgId: org.id };
}

/**
 * The configured Beta Code, or `null` when there isn't one.
 *
 * Read on each call rather than captured at module load, matching `requiredEnv` — and
 * `requiredEnv` itself is deliberately not used, because a missing value here is a
 * closed door rather than a crash.
 */
function configuredCode(): string | null {
  const code = process.env.SIGNUP_CODE;

  return code === undefined || code === "" ? null : code;
}

/**
 * Constant-time comparison, because this is a secret arriving over the network and a
 * timing oracle on it is the one attack a guessable-length string is actually vulnerable
 * to. `timingSafeEqual` throws on a length mismatch, so that case is answered first —
 * leaking the length of the expected code, which is the standard and accepted trade.
 */
function codeMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}
