import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServiceClient } from "@/lib/supabase/service-client";
import { createSessionClient, memoryCookieStore } from "@/lib/supabase/session-client";

import { signIn } from "./session";
import { signUp, signupIsOpen } from "./signup";

/**
 * Signing up, exercised against the real local Postgres.
 *
 * Not `.exclusive` the way the setup suite it replaces was: that screen's guard was
 * "`users` is empty", which could only be tested by emptying the table. This one's guard
 * is a code the deployment holds, and what it writes is namespaced like every other
 * fixture — so it runs beside the RLS suites rather than after them.
 *
 * The claim that matters most is the one the glossary makes: signing up creates a new,
 * empty organisation and never joins an existing one. It is asked below in the strongest
 * form available — two people naming their organisation identically get two
 * organisations, and neither can see the other's.
 */

const code = "a-beta-code-nobody-would-guess";
const password = "correct-horse-battery-staple";
const run = crypto.randomUUID().slice(0, 8);

const service = createServiceClient();

/** Everything this file creates, so it can be removed however the test ended. */
const createdUsers: string[] = [];
const createdOrgs: string[] = [];

function attempt(overrides: Partial<Parameters<typeof signUp>[0]> = {}) {
  return signUp({
    email: `founder-${run}-${crypto.randomUUID().slice(0, 8)}@example.test`,
    name: "Founder",
    password,
    organisation: `Org ${run}`,
    // Not the column's THB default, so that the value read back can only have come from
    // the form (ADR-0036).
    reportingCurrency: "SGD",
    code,
    ...overrides,
  });
}

async function kept(result: Awaited<ReturnType<typeof signUp>>) {
  if (result.ok) {
    createdUsers.push(result.userId);
    createdOrgs.push(result.orgId);
  }

  return result;
}

async function orgsNamed(name: string): Promise<number> {
  const { count, error } = await service
    .from("orgs")
    .select("id", { count: "exact", head: true })
    .eq("name", name);

  if (error) throw error;

  return count ?? 0;
}

beforeAll(() => {
  process.env.SIGNUP_CODE = code;
});

afterAll(async () => {
  delete process.env.SIGNUP_CODE;

  // The profile goes before the org it points at; the Membership goes with the profile.
  await service.from("users").delete().in("id", createdUsers);

  for (const id of createdUsers) await service.auth.admin.deleteUser(id);

  await service.from("orgs").delete().in("id", createdOrgs);
});

describe("the door", () => {
  it("is shut when no code is configured", async () => {
    delete process.env.SIGNUP_CODE;

    try {
      expect(signupIsOpen()).toBe(false);
      expect(await attempt()).toEqual({ ok: false, reason: "closed" });
    } finally {
      process.env.SIGNUP_CODE = code;
    }
  });

  it("is open when one is", () => {
    expect(signupIsOpen()).toBe(true);
  });

  it("refuses a code that does not match", async () => {
    expect(await attempt({ code: "not-the-code" })).toEqual({
      ok: false,
      reason: "wrong_code",
    });
  });

  it("refuses an empty code, which is what an unset field submits as", async () => {
    expect(await attempt({ code: "" })).toEqual({ ok: false, reason: "wrong_code" });
  });

  it("writes nothing until the code has matched", async () => {
    // Asked through the one observable the refusal leaves: an address that was refused
    // for its code has to be still free afterwards. If the account had been created
    // first and the code checked second, the retry below would come back `email_taken`
    // — and the person holding the right code would be locked out of their own address
    // by their own typo.
    const email = `retry-${run}@example.test`;
    const organisation = `Retry ${run}`;

    expect(await attempt({ email, organisation, code: "typo" })).toEqual({
      ok: false,
      reason: "wrong_code",
    });
    expect(await orgsNamed(organisation)).toBe(0);

    const retry = await kept(await attempt({ email, organisation }));

    expect(retry.ok).toBe(true);
  });

  it("refuses a currency nothing could convert into, before touching the database", async () => {
    const organisation = `Unconvertible ${run}`;

    expect(await attempt({ organisation, reportingCurrency: "XXX" })).toEqual({
      ok: false,
      reason: "unknown_currency",
    });
    expect(await orgsNamed(organisation)).toBe(0);
  });
});

describe("the organisation it creates", () => {
  it("is new, reports in the currency asked, and has the person as its Org Admin", async () => {
    const email = `founder-${run}@example.test`;
    const result = await kept(await attempt({ email, organisation: `Founded ${run}` }));

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    const { data: org } = await service
      .from("orgs")
      .select("name, reporting_currency, timezone")
      .eq("id", result.orgId)
      .single();

    const { data: profile } = await service
      .from("users")
      .select("email, name, locale, active_org_id")
      .eq("id", result.userId)
      .single();

    const { data: memberships } = await service
      .from("memberships")
      .select("is_org_admin, org_id, disabled_at")
      .eq("user_id", result.userId);

    // The Reporting Currency is the form's answer and not the column's default, which is
    // the whole reason the form asks. The timezone *is* the default, and is read back so
    // that the day somebody makes the form ask it, this line has to change with it.
    expect(org).toEqual({
      name: `Founded ${run}`,
      reporting_currency: "SGD",
      timezone: "Asia/Bangkok",
    });

    // Exactly one Membership, of the org just created, carrying the capability — and the
    // Active Org pointing at the same place, so the first request after signing in lands
    // somewhere (ADR-0037).
    expect(memberships).toEqual([
      { is_org_admin: true, org_id: result.orgId, disabled_at: null },
    ]);
    expect(profile).toMatchObject({ email, name: "Founder", active_org_id: result.orgId });

    // Null on purpose, exactly as an invited colleague's is: first start-up asks rather
    // than inferring, and the signup form has no language question on it.
    expect(profile!.locale).toBeNull();

    // `email_confirm` is set at creation, so there is no confirmation mail standing
    // between typing the password and using it.
    expect(await signIn({ email, password }, memoryCookieStore())).toEqual({ ok: true });
  });

  it("never joins an existing organisation, even one with the same name", async () => {
    const organisation = `Twins ${run}`;

    const first = await kept(await attempt({ organisation }));
    const second = await kept(await attempt({ organisation }));

    expect(first.ok && second.ok).toBe(true);

    if (!first.ok || !second.ok) return;

    // Two organisations, not one with two members. The name is not a key and nothing
    // looks an organisation up by it; the only way into the first is an Invite from its
    // Org Admin, which the second person is not.
    expect(second.orgId).not.toBe(first.orgId);
    expect(await orgsNamed(organisation)).toBe(2);
  });

  it("is invisible to the member of another one, name or no name", async () => {
    // The org boundary as the second founder sees it: signed in through the same path
    // a browser takes, the only organisation and the only Membership they can read are
    // their own. `rls.test.ts` proves this of the policies in general; it is asked again
    // here of rows this exact writer produced, because this is the writer that makes a
    // second organisation exist at all.
    const organisation = `Twins ${run}`;
    const email = `third-${run}@example.test`;
    const third = await kept(await attempt({ email, organisation }));

    expect(third.ok).toBe(true);

    if (!third.ok) return;

    const store = memoryCookieStore();

    expect(await signIn({ email, password }, store)).toEqual({ ok: true });

    const client = createSessionClient(store);
    const { data: orgs } = await client.from("orgs").select("id");
    const { data: memberships } = await client.from("memberships").select("org_id, user_id");

    expect(orgs).toEqual([{ id: third.orgId }]);
    expect(memberships).toEqual([{ org_id: third.orgId, user_id: third.userId }]);
  });

  it("refuses an address that already has an account, and leaves no organisation behind", async () => {
    const email = `taken-${run}@example.test`;
    const first = await kept(await attempt({ email, organisation: `First ${run}` }));

    expect(first.ok).toBe(true);

    const organisation = `Second ${run}`;

    expect(await attempt({ email, organisation })).toEqual({
      ok: false,
      reason: "email_taken",
    });

    // The account is refused before the organisation is written, so there is nothing to
    // undo — and nothing left over. An empty organisation nobody holds a place in would
    // be unreachable forever, and it would count against whoever reads `orgs` next.
    expect(await orgsNamed(organisation)).toBe(0);
  });
});
