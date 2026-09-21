import "server-only";

import { currentUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service-client";
import type { SessionCookieStore } from "@/lib/supabase/session-client";

/** One organisation the reader holds a live Membership in, as the switcher offers it. */
export type HeldOrg = { id: string; name: string };

/**
 * Every organisation the reader is currently a member of, named.
 *
 * **Read with the service role, which is the opposite of the rule everywhere else in this
 * app — and it has to be.** `memberships` is readable by `authenticated` only where
 * `org_id = current_org_id()`, so a session-client read of this table answers with the
 * Active Org and nothing else. That is exactly right for every other reader of it, and
 * useless for the one question this function asks, which is *what else is there*. The
 * boundary is not lost by asking past RLS here: the filter is `user_id = caller.id`,
 * which is narrower than any policy, and the answer is a list of the caller's own places.
 * Nothing about anybody else is reachable through it — not who else is in those orgs, not
 * what is in them, only their names.
 *
 * **The obvious alternative is worse, and it is worth saying why.** A second policy on
 * `memberships` — `using (user_id = auth.uid())`, your own places are yours to see — would
 * let the session client answer this and would save the round trip. It would also widen
 * what `currentUser`'s embed returns from one Membership to all of them, and that read
 * picks the first element of the array. The org the app believes it is in would become an
 * arbitrary choice made in TypeScript, while `current_org_id()` went on answering with the
 * Active Org in SQL — two homes for one rule, disagreeing silently, on the question every
 * policy in the schema is written in terms of. As it stands the session client can see
 * exactly one Membership, so the session's `orgId` cannot diverge from the database's.
 * That property is worth a round trip.
 *
 * **Ended Memberships are left out**, because this is a list of places you can go. A
 * Membership that has been Disabled is one `current_org_id()` refuses to answer with, so
 * offering it would be offering a switch that silently lands the reader on an app with
 * nothing in it. `listMemberships` is the read that deliberately keeps them, and it keeps
 * them because a Disabled colleague is who the People screen is opened to look at.
 *
 * **Sorted here rather than in SQL**, which is the reverse of the argument `members.ts`
 * makes at length about its own reads, and for the reason that argument turns on: that one
 * orders a table somebody reads down looking for a person, and an unordered read there is
 * the planner's answer rather than the query's. This is a handful of names in a menu — two,
 * in every case anyone has yet — ordered so the menu does not reshuffle itself between
 * openings. PostgREST cannot order a parent by an embedded column anyway, so the choice is
 * between this and a second round trip for a list this size.
 */
export async function listHeldOrgs(store: SessionCookieStore): Promise<HeldOrg[]> {
  const caller = await currentUser(store);

  if (!caller) return [];

  const { data } = await createServiceClient()
    .from("memberships")
    .select("org_id, orgs!inner(name)")
    .eq("user_id", caller.id)
    .is("disabled_at", null);

  return (data ?? [])
    .map((row) => ({
      id: row.org_id as string,
      // PostgREST answers a many-to-one embed with an object, not a list: one Membership
      // belongs to exactly one organisation. The client infers an array either way,
      // because it reads the select string and cannot see which side of the foreign key
      // it is standing on — so the shape is asserted here rather than indexed into, which
      // would compile and then read `undefined` at runtime.
      name: (row.orgs as unknown as { name: string }).name,
    }))
    .sort((one, other) => one.name.localeCompare(other.name));
}

/**
 * Look at a different organisation.
 *
 * The one thing that *changes* `users.active_org_id` — `setup.ts` and `invite.ts` default
 * it on the row they create, to the org of the person's first Membership, and nothing
 * else touches it — and the whole of what switching is: a column, not a cookie and not a
 * claim (ADR-0037), so the answer `current_org_id()` gives inside every policy changes on
 * the next statement rather than on the next token refresh.
 *
 * **It refuses an org the caller holds no live Membership in, and that refusal is not
 * belt-and-braces.** `current_org_id()` already treats the column as a selector over
 * Memberships actually held, so a forged value names nothing and the reader would see an
 * empty app rather than somebody else's. But an empty app is a wrong answer too — it is
 * indistinguishable from a real org with nothing in it — and a column the app will write
 * with whatever it is handed is one the next reader of the schema has to re-derive the
 * safety of. The check is cheap and states the rule where the write is.
 *
 * Written with the service role because `users.active_org_id` is not a column
 * `authenticated` may set: 20260814010000's carve-out grants members their own `name`,
 * `locale` and `theme` and nothing else, deliberately, and a person who could write their
 * own Active Org could write it to an org they have been Disabled out of. The gate above
 * is what earns the service client, the same way `setMembershipDisabled`'s admin check
 * earns its own.
 */
export async function switchActiveOrg(
  orgId: string,
  store: SessionCookieStore,
): Promise<boolean> {
  const caller = await currentUser(store);

  if (!caller) return false;

  const service = createServiceClient();

  const { data: membership } = await service
    .from("memberships")
    .select("org_id")
    .eq("user_id", caller.id)
    .eq("org_id", orgId)
    .is("disabled_at", null)
    .maybeSingle();

  if (!membership) return false;

  const { error } = await service
    .from("users")
    .update({ active_org_id: orgId })
    .eq("id", caller.id);

  return error === null;
}
