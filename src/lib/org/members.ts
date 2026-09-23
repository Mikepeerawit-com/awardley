import "server-only";

import { currentUser } from "@/lib/auth/session";
import { getOrgSettings } from "@/lib/org/org";
import { capReached } from "@/lib/plan/plan";
import { createServiceClient } from "@/lib/supabase/service-client";
import {
  createSessionClient,
  type SessionCookieStore,
} from "@/lib/supabase/session-client";

export type Member = { id: string; name: string };

/**
 * One person's place in this org, as the People screen reads it (CONTEXT.md, Identity).
 *
 * A **Membership** rather than a person: `isOrgAdmin` and `disabledAt` are facts about
 * somebody's place *here*, and the glossary is explicit that admin of one organisation
 * says nothing about any other. {@link Member} is the same person seen by a picker, which
 * needs only enough to label an option.
 */
export type Membership = Member & {
  email: string;
  wecomUserid: string | null;
  isOrgAdmin: boolean;
  disabledAt: string | null;
};

/** A member as the Owner picker offers them: `former` is one who has since been Disabled. */
export type OwnerOption = Member & { former: boolean };

/**
 * Everyone who can still be given work: the org's members, disabled ones left out.
 *
 * Read through the session client, so RLS is what scopes it to the caller's org. A
 * disabled member keeps their rows — a Quote records who sourced it — but must not
 * appear in a picker that would make them a Tender's Owner or Assignee.
 *
 * The `id` tiebreak is the one key of the three #119 found that the database seam can
 * answer for: taken away, `members.test.ts` goes red 10 times in 10.
 */
export async function listMembers(store: SessionCookieStore): Promise<Member[]> {
  const { data } = await createSessionClient(store)
    .from("users")
    // Still a read of `users`, and it has to be: the ordering below is the whole reason
    // this function exists, and it can only be stated on the table that carries `name`.
    // What the embed adds is the half that moved — being here, and still being here — and
    // `!inner` turns it into the join that keeps everyone else out. A person with no
    // Membership of the caller's Active Org produces no row rather than a nameless one.
    .select("id, name, memberships!inner(disabled_at)")
    // The Membership's end, not the account's. Disabling writes `memberships.disabled_at`
    // and nothing else, so a colleague let go here leaves *this* org's pickers and no
    // others'; `users.disabled_at` is the dashboard's account-wide switch and is not what
    // this question is about.
    .is("memberships.disabled_at", null)
    // Two colleagues can share a name — this is a picker, and an option that moves
    // between two openings of the same form is one a person clicks the wrong one of.
    // `id` decides that rather than the heap.
    .order("name")
    .order("id");

  // Narrowed rather than handed back as read, which `overrideTypes` used to do for this
  // query. An embed puts a `memberships` array on every row, and a `Member` that quietly
  // carries one is a shape that reaches a client component and a `<select>` for no reason
  // anybody reading either would be able to guess at.
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

/**
 * Every Membership in the org, Disabled included, as the People screen reads them.
 *
 * The one read that must *not* leave Disabled colleagues out: this is the screen an admin
 * opens to see who is here, and somebody who has been Disabled is exactly who they came
 * to check on. {@link listMembers} answers the other question — who may still be given
 * work — and the two differ only in that, in the columns, and in nothing else.
 *
 * **A function rather than the query inlined on the page**, which is what the page had
 * until #119. `PeoplePage` is an `async` Server Component and `vitest.config.mts` says
 * why that matters: no seam in this repo can call one, so a rule written there is a rule
 * nothing can check (ADR-0016). The ordering is such a rule.
 */
export async function listMemberships(
  store: SessionCookieStore,
): Promise<Membership[]> {
  const { data } = await createSessionClient(store)
    .from("users")
    // Four columns from the person and two from their place here, in one read. The split
    // is the point rather than an accident of storage: a name and an email follow somebody
    // between organisations, and whether they are an admin and whether they are still here
    // do not. `!inner` is doing no filtering work this policy would not already do — the
    // `users` policy shows exactly the people who hold a Membership of the Active Org —
    // but it is what makes the embedded row's presence something the mapper can rely on.
    .select("id, name, email, wecom_userid, memberships!inner(is_org_admin, disabled_at)")
    // The same rule as {@link listMembers}, stated the same way: names are not unique, and
    // this is the table an admin reads down looking for one person.
    //
    // **And the one key of the three that no check covers directly, which is a measured
    // result rather than an omission (#119).** Taken away and the whole suite run in
    // parallel ten times, the read handed back the asserted order anyway — **0 red in
    // 10**, against 10 in 10 for `listMembers` on the same two columns of the same table.
    // An untiebroken read is the planner's answer, not the query's (#105), and a check
    // that passes whether or not the thing it guards is present is worse than none
    // (ADR-0016), so no such check was left behind here.
    //
    // What covers it is `listMembers`' check one function above: same table, same two
    // columns, same rule, and nothing in this file can change one ordering without the
    // reader seeing the other. Moving the rule to a comparator was tried and measured
    // too — sorting in JS instead makes deleting the sort a coin toss, 5 and 6 red in 10
    // for the two reads, because an unordered read is then pure heap order. That is the
    // check #105 refuses, so this stays in SQL.
    .order("name")
    .order("id");

  // Mapped inline rather than through a named row mapper like `tenderSummary`: naming the
  // row's shape means writing `is_org_admin:` in a type, and `conventions.test.ts` allows
  // exactly one file in the repo to write that column's name followed by a colon —
  // `auth/signup.ts`, which is where an Org Admin is minted (ADR-0039). Inferring the
  // shape from the query keeps that rule a real one rather than one with an exception in
  // it, and it survives the column moving to `memberships`, because the rule is about the
  // name and the name did not change.
  return (data ?? []).map((row) => {
    // One element, because a person holds at most one Membership per org and the policy on
    // the embedded table answers with one org. Taken without a fallback, because there is
    // nothing sensible to fall back *to* — a person on this screen with no Membership of
    // this org is a contradiction, and `!inner` has already ruled it out of the result set.
    const [membership] = row.memberships;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      wecomUserid: row.wecom_userid,
      isOrgAdmin: membership.is_org_admin,
      disabledAt: membership.disabled_at,
    };
  });
}

/**
 * Who the Owner picker may show: everyone who can still be given work, plus — if they
 * are not already among them — whoever owns this Tender today.
 *
 * A `<select>` whose value matches no option is not empty; the browser selects the first
 * option instead. Left to `listMembers` alone, a Tender owned by a since-disabled
 * colleague therefore renders as owned by whoever sorts first by name, and pressing Save
 * makes that true — a silent hand-over, on the screen somebody opens *because* a
 * colleague left.
 *
 * The former Owner is kept last and marked rather than quietly mixed in: they are not a
 * choice on offer, they are the answer to "who has this now".
 */
export function ownerOptions(
  members: Member[],
  owner: Member | null,
): OwnerOption[] {
  const options = members.map((member) => ({ ...member, former: false }));

  if (!owner?.id || options.some((option) => option.id === owner.id)) return options;

  return [...options, { ...owner, former: true }];
}

export const membershipDisableRefusals = [
  "not_admin",
  "not_found",
  "last_admin",
  "plan_limit",
  "failed",
] as const;

export type MembershipDisableRefusal = (typeof membershipDisableRefusals)[number];

/**
 * How ending or restoring a Membership can end, as the Org Admin sees it.
 *
 * The two successes are separate because they are opposite sentences: one says a
 * colleague can no longer sign in, the other says they can again. A single "Saved" would
 * leave the admin reading the same word whichever way the row went, on the one screen
 * where getting it backwards locks somebody out. Walked by `messages.test.ts`.
 */
export const membershipDisableStatuses = [
  ...membershipDisableRefusals,
  "disabled",
  "readmitted",
] as const;

export type MembershipDisableStatus = (typeof membershipDisableStatuses)[number];

/**
 * End a colleague's Membership, or re-admit one who came back.
 *
 * The write side of {@link listMemberships}, and it lives beside the reads because
 * Disabling is defined by what those reads then do: the person keeps every row they own
 * and leaves every picker that would give them new work. Users are never deleted —
 * a departing colleague owns Tenders and entered Quotes the comparison view is built on.
 *
 * `disabledAt` is the value written rather than a flag, so the instant is the one the
 * request boundary read (ADR-0010); `null` is the readmission.
 *
 * Admin-gated, and enforced here rather than in the screen that draws the control,
 * because a server action is a public endpoint that anyone signed in can POST to. The
 * service client does the write for the same reason `setWecomUserid` does: this is a
 * column on somebody else's row, and it is scoped to the caller's own org by hand.
 *
 * **A known and accepted race:** the last-Org-Admin check and the write are two
 * statements rather than one, so two Org Admins Disabling *each other* within the same
 * moment could both pass a check that counted the other, and land an org with none. It
 * needs two admins, acting concurrently, in opposite directions — an org has exactly one
 * unless somebody ran the dashboard `update` in README §6 to make a second, which is the
 * same dashboard the recovery runs from. Closing it properly means a constraint trigger
 * or an RPC, which is a migration and a second home for the rule, and neither is worth it
 * for a screen fewer than ten people can open. Revisit if promoting an admin ever becomes
 * something the app itself can do.
 */
export async function setMembershipDisabled(
  { userId, disabledAt }: { userId: string; disabledAt: Date | null },
  store: SessionCookieStore,
): Promise<{ ok: true } | { ok: false; reason: MembershipDisableRefusal }> {
  const caller = await currentUser(store);

  if (!caller?.isOrgAdmin) return { ok: false, reason: "not_admin" };

  const service = createServiceClient();

  // Read the Membership before writing the person, so "they are not yours to Disable" is
  // answered as `not_found` rather than by the rule below happening to look at the wrong
  // org. It reads the Membership and not the `users` row because that is now the only
  // place the two facts it needs both live: whether this colleague is here at all, and
  // whether they are an admin *here*. A person who runs another organisation entirely is
  // not an admin this rule has to protect.
  //
  // The org is filtered by hand, as every service-role read in this file is: the client
  // bypasses RLS, so the boundary the session client would have stated has to be written
  // out. `caller.orgId` is the Active Org, which is the org this screen is showing.
  const { data: target } = await service
    .from("memberships")
    .select("is_org_admin, disabled_at")
    .eq("user_id", userId)
    .eq("org_id", caller.orgId)
    .maybeSingle();

  if (!target) return { ok: false, reason: "not_found" };

  // **Readmitting is an Invite by another name, and the plan counts it as one** (ADR-0040).
  // Both conditions are load-bearing. `disabledAt === null` is the readmission — Disabling
  // is refused by no cap ever, because a plan that stopped an organisation letting
  // somebody go would be a cap that made itself harder to get under. And
  // `target.disabled_at !== null` is what keeps the no-op a no-op: pressing Restore on a
  // colleague who never left changes nothing, adds nobody, and must not be answered with
  // a sentence about the plan on an org that happens to be sitting on its cap.
  if (
    disabledAt === null &&
    target.disabled_at !== null &&
    (await membershipCapReached(caller.orgId, store))
  ) {
    return { ok: false, reason: "plan_limit" };
  }

  if (
    disabledAt !== null &&
    target.is_org_admin &&
    !(await anotherAdminRemains(userId, caller.orgId))
  ) {
    return { ok: false, reason: "last_admin" };
  }

  // The write lands on the Membership, so Disabling ends this person's place in *this*
  // organisation and says nothing about any other. For one release it was a write to
  // `users.disabled_at` — the account — carried across by trigger, which answered "do all
  // reads agree" and got the scope wrong: an account spans organisations, and the day
  // somebody held two, an Org Admin of one would have been ending their access to the
  // other. That was the sentence #177 was written against, and the contract migration
  // (#206) is where the write could finally move.
  //
  // `caller.orgId` is on the update as well as on the read above, and the repetition is
  // the point. The read proved this colleague holds a place *here*; the filter makes the
  // write unable to reach any other place they hold, whatever the read established. The
  // Membership is the boundary, stated on both statements.
  //
  // `users.disabled_at` survives as the account-level switch, set from the dashboard and
  // read by `current_org_id()` alongside this one. Nothing in the app writes it.
  const { data, error } = await service
    .from("memberships")
    .update({ disabled_at: disabledAt === null ? null : disabledAt.toISOString() })
    .eq("user_id", userId)
    .eq("org_id", caller.orgId)
    .select("id");

  // A write that failed is not a person who is not here. The row was read a moment ago,
  // so `not_found` at this point would be a sentence naming a colleague whose row the
  // admin is looking at — false, and the kind of false that sends somebody to check the
  // wrong thing.
  if (error !== null) return { ok: false, reason: "failed" };

  return data.length === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}

/**
 * Would one more live Membership put this organisation over its plan (ADR-0040)?
 *
 * The one question both ways into an organisation ask — `invite` before it sends
 * anything, and the readmission above — which is why it lives here rather than once in
 * each. Live means not Disabled, exactly as {@link listMembers} means it: a colleague who
 * has been let go holds every row they ever owned and occupies nothing the plan counts,
 * so an org at its cap gets back under it by Disabling somebody rather than by deleting
 * them. Nobody is ever deleted (ADR-0017's neighbouring promise), and this is the check
 * that has to be written so that nobody ever needs to be.
 *
 * Counted over `memberships` with the service client and the org filtered by hand, which
 * is `anotherAdminRemains`' shape below and for its reason: the client bypasses RLS, so
 * the boundary the session client would have stated is written out. The *plan* is read
 * through the session client instead, because that is the one read whose answer RLS
 * already scopes — and reading it any other way would be asking a question about an
 * organisation the caller named rather than the one they are in.
 *
 * A count that could not be read is not an empty organisation, and refuses. `noPlan`
 * makes the identical call one level up: a broken read must never come out as a free
 * upgrade, and the direction this fails in is a refusal somebody will report.
 */
export async function membershipCapReached(
  orgId: string,
  store: SessionCookieStore,
): Promise<boolean> {
  const { plan } = await getOrgSettings(store);

  // Before the count, because an uncapped plan has no count to take.
  if (plan.membershipCap === null) return false;

  const { count } = await createServiceClient()
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("disabled_at", null);

  if (count === null) return true;

  return capReached(plan.membershipCap, count);
}

/**
 * Whether the org would still have an Org Admin without this one.
 *
 * ADR-0017: an organisation must always keep at least one, because the alternative is an
 * org nobody can ever invite anybody into again, with no route back inside the app.
 *
 * It counts **the Org Admins who would be left** rather than reading the flag on the row
 * in front of it. Read the other way the rule becomes "an Org Admin can never be
 * Disabled", which is a different and wrong one — an admin among several may leave like
 * anybody else. Disabled admins do not count: one who has themselves been Disabled can
 * invite nobody, so they leave the org exactly as stranded as no second admin at all.
 */
async function anotherAdminRemains(userId: string, orgId: string): Promise<boolean> {
  // Counted over Memberships rather than people, which is what makes the sentence above
  // narrow enough to be true: the question is whether *this organisation* would still have
  // somebody able to invite into it, and an admin of some other org answers it no better
  // than a stranger would.
  const { count } = await createServiceClient()
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_org_admin", true)
    .is("disabled_at", null)
    .neq("user_id", userId);

  return (count ?? 0) > 0;
}
