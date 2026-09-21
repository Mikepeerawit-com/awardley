-- The Membership is what the app writes, and the legacy columns come off.
--
-- This is the contract half of the pair 20260919000000 opened. That migration built
-- `memberships`, backfilled it from the rows that already existed, pointed
-- `current_org_id()` and the `users` policy at it, and dropped nothing: the build then in
-- production still wrote `users.org_id`, `users.is_org_admin` and `users.disabled_at`,
-- and two triggers carried each of those writes across so that what RLS read and what
-- the app wrote could not disagree. Its header says why the drop could not happen in the
-- same file — preview and production share one Supabase project, migrations are pushed
-- by hand, and a column `current_org_id()` still read going missing between the push and
-- the deploy is not a broken screen, it is org isolation.
--
-- The build that writes the Membership directly is live now — #206's precondition — so
-- nothing running reads or writes the two columns, and this migration is the pure
-- deletion the expand half promised to leave it:
--
--   * the two triggers and their functions;
--   * `users.org_id` and `users.is_org_admin`.
--
-- Nothing is rewritten. `current_org_id()` already reads `memberships`, the `users`
-- policy is already on `shares_current_org()`, and every other policy in the schema
-- carries its own `org_id` and never looked at this one. If a future version of this
-- file needs a `create or replace` anywhere, the expand half missed something and the
-- window between push and deploy is open again.

-- ---------------------------------------------------------------------------------
-- The compatibility shim
-- ---------------------------------------------------------------------------------
--
-- Triggers first, because the functions cannot go while a trigger names them, and
-- `drop function ... cascade` would take the trigger silently — the wrong shape for a
-- file whose whole claim is that it removes exactly four objects and two columns, and
-- restates two comments.
--
-- `mirror_user_row_to_membership()`'s own comment said it: "if it is still here after
-- the contract migration, something still writes the old shape." The three writers —
-- seeding the first org, inviting, Disabling — write `memberships` themselves in the
-- build this file accompanies, and `conventions.test.ts` no longer forbids them to.
drop trigger users_mirror_membership on public.users;
drop trigger users_default_active_org on public.users;

drop function public.mirror_user_row_to_membership();
drop function public.set_active_org_from_users_row();

-- `users_default_active_org` filled `users.active_org_id` from `users.org_id` on insert,
-- and there is no `users.org_id` to fill it from. The default moves into the two writers
-- that create a person's first Membership — `setup.ts` and `invite.ts` write the column on
-- the row they insert, to the org that Membership is of — so ADR-0037's sentence holds
-- unchanged: every row the app writes has an Active Org, and it names a place the person
-- actually holds. Not a trigger on `memberships` in its place, because a trigger that
-- writes `users` from `memberships` is a second shim in a file whose one job is removing
-- the first, and the fact it would encode is one the writer already knows.

-- ---------------------------------------------------------------------------------
-- The columns
-- ---------------------------------------------------------------------------------
--
-- Deliberately without `cascade`. A policy, view or index still leaning on either
-- column makes this fail to apply — locally first, on `db:reset`, which is the right
-- place to find out. Their column privileges, the FK to `orgs` and the comment on
-- `is_org_admin` (20260814010000) go with them.
alter table public.users
  drop column org_id,
  drop column is_org_admin;

-- ---------------------------------------------------------------------------------
-- What the two surviving comments now have to say
-- ---------------------------------------------------------------------------------
--
-- The `memberships` table comment ended "until the contract migration, `users.org_id`
-- and `users.is_org_admin` are still the columns the app writes and these rows are kept
-- in step by trigger" — a sentence this file makes false. Restated rather than trimmed:
-- who writes the table is now the interesting half.
comment on table public.memberships is
  'One person''s place in one organisation. An Invite creates one, Disabling ends one, and `current_org_id()` reads them — so admin of one organisation grants nothing anywhere else. Written by the service role only, from the server actions that do those three things; nothing on a Membership is the member''s own to edit.';

-- `users.disabled_at` stays, and it changes meaning by staying. Disabling in the app now
-- ends a Membership — `memberships.disabled_at`, one org, scoped by the Org Admin doing
-- it — and writes nothing here. This column is the account: the dashboard's lever for
-- ending a person's access everywhere at once, which no Org Admin may reach, and which
-- `current_org_id()` still reads so that a switched-off account holds no live Membership
-- anywhere. Two gates, both required clear, each owned by a different hand.
comment on column public.users.disabled_at is
  'The account, switched off. Not what Disabling in the app writes — that ends one Membership (`memberships.disabled_at`) and says nothing about any other. Set only from the dashboard, and `current_org_id()` requires it and the Membership''s to both be clear.';
