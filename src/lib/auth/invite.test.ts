import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createServiceClient } from "@/lib/supabase/service-client";
import { memoryCookieStore } from "@/lib/supabase/session-client";

import { invite, setWecomUserid } from "./invite";
import { signIn } from "./session";

const password = "correct-horse-battery-staple";
const run = crypto.randomUUID().slice(0, 8);

const service = createServiceClient();

/**
 * The plan both of this suite's orgs are on — this run's own row, never a seeded one.
 *
 * `free` allows three Memberships and both orgs here are smaller than that, so the
 * default would have left the cap silently untested rather than in the way. It is a row
 * of its own anyway, for the reason every fixture in this repo is run-scoped: `free` and
 * `paid` are read by every suite running in parallel, and a test that put a number on
 * either would fail somebody else's org.
 */
const planId = `plan-${run}`;

const admin = { id: "", email: `admin-${run}@example.test` };
const member = { id: "", email: `member-${run}@example.test` };
const otherOrgAdmin = { id: "", email: `other-admin-${run}@example.test` };

let orgId = "";
let otherOrgId = "";

// Anything an invite creates, so it can be removed however the test ended.
const invited: string[] = [];

async function createOrg(name: string): Promise<string> {
  const { data, error } = await service
    .from("orgs")
    .insert({ name, plan_id: planId })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

/** Puts a cap on this suite's own plan for the length of one test, or takes it off. */
async function capMembershipsAt(cap: number | null): Promise<void> {
  const { error } = await service
    .from("plans")
    .update({ membership_cap: cap })
    .eq("id", planId);

  if (error) throw error;
}

/** Ends or restores somebody's Membership behind the app's back, as a fixture. */
async function setDisabled(
  who: { id: string },
  disabledAt: string | null,
): Promise<void> {
  const { error } = await service
    .from("memberships")
    .update({ disabled_at: disabledAt })
    .eq("user_id", who.id)
    .eq("org_id", orgId);

  if (error) throw error;
}

async function createMember(
  org: string,
  who: { id: string; email: string },
  isOrgAdmin: boolean,
): Promise<void> {
  const { data, error } = await service.auth.admin.createUser({
    email: who.email,
    password,
    email_confirm: true,
  });

  if (error) throw error;

  who.id = data.user.id;

  const { error: profileError } = await service.from("users").insert({
    id: who.id,
    active_org_id: org,
    name: who.email,
    email: who.email,
  });

  if (profileError) throw profileError;

  const { error: membershipError } = await service.from("memberships").insert({
    user_id: who.id,
    org_id: org,
    is_org_admin: isOrgAdmin,
  });

  if (membershipError) throw membershipError;
}

async function signedInAs(email: string) {
  const store = memoryCookieStore();
  const result = await signIn({ email, password }, store);

  if (!result.ok) throw new Error(`could not sign in as ${email}`);

  return store;
}

beforeAll(async () => {
  const { error } = await service.from("plans").insert({
    id: planId,
    open_tender_cap: null,
    membership_cap: null,
    photos_per_item_cap: null,
    money_layer: true,
  });

  if (error) throw error;

  orgId = await createOrg(`Invite ${run}`);
  otherOrgId = await createOrg(`Invite other ${run}`);

  await createMember(orgId, admin, true);
  await createMember(orgId, member, false);
  await createMember(otherOrgId, otherOrgAdmin, true);
});

afterEach(async () => {
  // Uncapped again, and everybody back where the fixture put them, so that a test about
  // the plan cannot change what any later test's org looks like.
  await capMembershipsAt(null);
  await setDisabled(member, null);

  if (invited.length === 0) return;

  await service.from("users").delete().in("id", invited);

  for (const id of invited) {
    await service.auth.admin.deleteUser(id);
  }

  invited.length = 0;
});

afterAll(async () => {
  const ids = [admin.id, member.id, otherOrgAdmin.id].filter((id) => id !== "");

  await service.from("users").delete().in("id", ids);

  for (const id of ids) {
    await service.auth.admin.deleteUser(id);
  }

  await service.from("orgs").delete().in("id", [orgId, otherOrgId].filter(Boolean));

  // After the orgs: `orgs.plan_id` references this row, and a plan dropped while an org
  // still points at it makes the teardown report a foreign key instead of the suite.
  await service.from("plans").delete().eq("id", planId);
});

describe("invite", () => {
  it("lets an Org Admin invite a colleague", async () => {
    const store = await signedInAs(admin.email);

    const result = await invite(
      { email: `new-${run}@example.test`, name: "Nok" },
      store,
    );

    expect(result.ok).toBe(true);

    if (result.ok) invited.push(result.userId);
  });

  it("gives the invitee a profile in the inviter's org, with no locale yet", async () => {
    const store = await signedInAs(admin.email);

    const result = await invite(
      { email: `profile-${run}@example.test`, name: "Nok" },
      store,
    );

    if (!result.ok) throw new Error("invite failed");

    invited.push(result.userId);

    const { data } = await service
      .from("users")
      .select("name, locale")
      .eq("id", result.userId)
      .single();

    expect(data).toEqual({ name: "Nok", locale: null });

    const { data: membership } = await service
      .from("memberships")
      .select("org_id, is_org_admin")
      .eq("user_id", result.userId)
      .single();

    expect(membership).toEqual({ org_id: orgId, is_org_admin: false });
  });

  it("refuses a member who is not an Org Admin", async () => {
    // The action is a public endpoint. Hiding the form is not the gate.
    const store = await signedInAs(member.email);

    const result = await invite(
      { email: `refused-${run}@example.test`, name: "Nobody" },
      store,
    );

    expect(result).toEqual({ ok: false, reason: "not_admin" });
  });

  it("refuses a caller with no session at all", async () => {
    const result = await invite(
      { email: `anon-${run}@example.test`, name: "Nobody" },
      memoryCookieStore(),
    );

    expect(result).toEqual({ ok: false, reason: "not_admin" });
  });

  it("creates no account when it refuses", async () => {
    const email = `refused-${run}@example.test`;
    const store = await signedInAs(member.email);

    await invite({ email, name: "Nobody" }, store);

    const { data } = await service.from("users").select("id").eq("email", email);

    expect(data).toEqual([]);
  });

  it("reports an address that already has an account", async () => {
    const store = await signedInAs(admin.email);

    const result = await invite({ email: member.email, name: "Again" }, store);

    expect(result).toEqual({ ok: false, reason: "already_invited" });
  });

  /**
   * The plan's cap on live Memberships, at the way in (ADR-0040).
   *
   * The org is two people and the plan allows two, which is the shape the cap is
   * interesting in: the refusal is about the *next* one, so nothing an organisation
   * already has is touched by it.
   */
  describe("the plan's cap on Memberships", () => {
    it("refuses a third colleague on a plan that allows two", async () => {
      await capMembershipsAt(2);

      const result = await invite(
        { email: `capped-${run}@example.test`, name: "Nok" },
        await signedInAs(admin.email),
      );

      expect(result).toEqual({ ok: false, reason: "plan_limit" });
    });

    it("mints no account when it refuses, so the address is still invitable", async () => {
      // The cap is asked *before* `inviteUserByEmail`, and this is the whole reason it
      // has to be. An auth account created and then found to be over the plan cannot be
      // taken back cleanly — a second attempt at the same address comes back
      // `already_invited` forever, and the colleague has an invitation email either way.
      //
      // Proved through the address itself, because the auth account is the half the
      // profile read below cannot see: Supabase answers `already_invited` for an address
      // that already has one, so an invitation that goes through afterwards is an account
      // that was never minted.
      const email = `unminted-${run}@example.test`;
      const store = await signedInAs(admin.email);

      await capMembershipsAt(2);
      await invite({ email, name: "Nok" }, store);

      const { data } = await service.from("users").select("id").eq("email", email);

      expect(data).toEqual([]);

      await setDisabled(member, "2026-09-01T00:00:00Z");

      const second = await invite({ email, name: "Nok" }, store);

      expect(second.ok).toBe(true);

      if (second.ok) invited.push(second.userId);
    });

    it("counts the live Memberships only, so Disabling somebody frees their place", async () => {
      // A colleague who has left keeps every row they ever owned — nobody is deleted —
      // and occupies nothing the plan counts. That is what makes "Disable somebody, or
      // upgrade" a sentence an admin can act on rather than a demand for money.
      await capMembershipsAt(2);
      await setDisabled(member, "2026-09-01T00:00:00Z");

      const result = await invite(
        { email: `freed-${run}@example.test`, name: "Nok" },
        await signedInAs(admin.email),
      );

      expect(result.ok).toBe(true);

      if (result.ok) invited.push(result.userId);
    });

    it("refuses nothing on a plan with no cap", async () => {
      // Null is how the row says uncapped, and the suite's plan is left that way.
      const result = await invite(
        { email: `uncapped-${run}@example.test`, name: "Nok" },
        await signedInAs(admin.email),
      );

      expect(result.ok).toBe(true);

      if (result.ok) invited.push(result.userId);
    });
  });
});

describe("setWecomUserid", () => {
  it("lets an Org Admin set it by hand", async () => {
    const store = await signedInAs(admin.email);

    const result = await setWecomUserid(
      { userId: member.id, wecomUserid: `NokW-${run}` },
      store,
    );

    expect(result).toEqual({ ok: true });

    const { data } = await service
      .from("users")
      .select("wecom_userid")
      .eq("id", member.id)
      .single();

    expect(data?.wecom_userid).toBe(`NokW-${run}`);
  });

  it("refuses a member who is not an Org Admin", async () => {
    const store = await signedInAs(member.email);

    const result = await setWecomUserid(
      { userId: admin.id, wecomUserid: "Sneaky" },
      store,
    );

    expect(result).toEqual({ ok: false, reason: "not_admin" });
  });

  it("refuses to reach into another org", async () => {
    const store = await signedInAs(otherOrgAdmin.email);

    const result = await setWecomUserid(
      { userId: member.id, wecomUserid: "Reached" },
      store,
    );

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});
