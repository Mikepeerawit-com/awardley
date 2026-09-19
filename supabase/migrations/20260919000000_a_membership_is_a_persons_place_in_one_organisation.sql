-- A Membership is a person's place in one organisation.
--
-- `org_id` and `is_org_admin` have sat on the `users` row since the v1 schema, so one
-- organisation per person held by construction. The glossary has said otherwise for
-- longer than the code has: a Membership is what an Invite creates, what Disabling ends
-- and what RLS reads, which is why admin of one organisation grants nothing anywhere
-- else. This is the table that sentence needs.
--
-- ## This is the expand half, and the columns do not move yet
--
-- Preview and production share one Supabase project, migrations are pushed by hand, and
-- `Preview schema` is a required check that compares the *deployed* build against the
-- shared database. A migration that dropped `users.org_id` would therefore break the
-- running build from the moment it was pushed until the new deploy landed — and what
-- breaks is `current_org_id()`, which every policy in this schema reads. That is not a
-- broken screen, it is org isolation.
--
-- So nothing is dropped here. This migration only adds:
--
--   * `memberships`, backfilled from the rows that already exist;
--   * `users.active_org_id`, the Active Org (ADR-0037);
--   * two triggers that keep `memberships` true while the old columns are still the
--     ones being written;
--   * a rewritten `current_org_id()` that reads the new shape.
--
-- Every one of those is invisible to the build running right now, which keeps writing
-- `users.org_id` and reading a function whose *answer* is unchanged. The columns come off
-- in a second migration, after the build that no longer writes them is live. See
-- 20260918000000's header for the same argument the last destructive migration had to
-- make the hard way.

create table memberships (
  id              uuid primary key default gen_random_uuid(),
  -- `cascade`, where `users.id -> auth.users` is `restrict`, and the difference is which
  -- guarantee each one is holding. "Users are never deleted" is held one level up: a
  -- profile row cannot be removed while the auth account points at it, because a Quote
  -- records who sourced it and that attribution has to survive someone leaving. A
  -- Membership is not independent of the person — it is a place *they* hold, and it has
  -- no reading at all without them. Restricting here would not add a second lock on
  -- deleting people, it would only mean that anything which legitimately removes a
  -- profile row has to know to sweep this table first.
  user_id         uuid        not null references users(id) on delete cascade,
  org_id          uuid        not null references orgs(id),
  is_org_admin    boolean     not null default false,
  disabled_at     timestamptz,
  created_at      timestamptz not null default now(),

  -- One place per person per organisation. This is the constraint that makes the table
  -- a set of Memberships rather than a log of them, and it is what the mirror trigger
  -- below upserts against.
  unique (user_id, org_id)
);

comment on table memberships is
  'One person''s place in one organisation. An Invite creates one, Disabling ends one, and `current_org_id()` reads them — so admin of one organisation grants nothing anywhere else. Until the contract migration, `users.org_id` and `users.is_org_admin` are still the columns the app writes and these rows are kept in step by trigger.';
comment on column memberships.is_org_admin is
  'Gates inviting inside this one organisation and nothing else. A capability, not a rank, and not writable by `authenticated` at all — the grants at the foot of this file say so.';
comment on column memberships.disabled_at is
  'Soft end of a Membership. The person keeps every row they own — a Quote records who sourced it — and `current_org_id()` stops answering for this org, so they read nothing here. Ending one Membership says nothing about any other, which is why this is not `users.disabled_at`.';

-- Every user alive today holds exactly one Membership, and it is the one their `users`
-- row already describes. `created_at` carries across rather than defaulting to now(): the
-- Membership began when the person did, and a seat count that thinks every member joined
-- on migration day is a wrong answer to a question #179 is going to ask.
insert into memberships (user_id, org_id, is_org_admin, disabled_at, created_at)
select id, org_id, is_org_admin, disabled_at, created_at
from users;

-- ---------------------------------------------------------------------------------
-- The Active Org
-- ---------------------------------------------------------------------------------

-- ADR-0037: a row, not a JWT claim and not a cookie. `current_org_id()` runs inside every
-- policy in this schema, so whatever holds the answer has to be readable from inside
-- Postgres — which a cookie is not, without plumbing unverified browser input into the
-- one function org isolation rests on. A claim would work and costs an Auth hook plus a
-- forced token refresh on every switch; a column keeps the function the shape the whole
-- schema already trusts, and switching is one write.
alter table users add column active_org_id uuid references orgs(id);

comment on column users.active_org_id is
  'The one organisation this person is currently looking at (ADR-0037). Per-person rather than per-session, deliberately: the glossary calls the switcher a global mode, and two tabs showing two organisations is the thing it exists to prevent. Never trusted on its own — `current_org_id()` only answers with it when a live Membership backs it.';

update users set active_org_id = org_id;

-- ---------------------------------------------------------------------------------
-- Keeping the two shapes in step for one release
-- ---------------------------------------------------------------------------------
--
-- The build in production writes `users.org_id`, `users.is_org_admin` and
-- `users.disabled_at` — inviting somebody, seeding the first org, Disabling a colleague.
-- It knows nothing about `memberships`. These two triggers are what make that safe, and
-- they exist for exactly one release: the contract migration drops them along with the
-- columns they read.
--
-- SECURITY DEFINER because the writers reach `users` through the service role today but
-- the trigger must hold regardless of who the writer is, and `memberships` is not
-- writable by `authenticated` at all.

create function public.set_active_org_from_users_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Only ever fills a hole. A person who has chosen an Active Org keeps it; this is the
  -- default for a row inserted by a build that does not know the column is there.
  new.active_org_id := coalesce(new.active_org_id, new.org_id);
  return new;
end
$$;

create trigger users_default_active_org
  before insert on public.users
  for each row
  execute function public.set_active_org_from_users_row();

create function public.mirror_user_row_to_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.memberships (user_id, org_id, is_org_admin, disabled_at)
  values (new.id, new.org_id, new.is_org_admin, new.disabled_at)
  on conflict (user_id, org_id) do update
    set is_org_admin = excluded.is_org_admin,
        disabled_at  = excluded.disabled_at;

  return null;
end
$$;

-- `update of` and not a bare `update`: the only columns whose change this has to chase
-- are the three being mirrored. It also means the row can be renamed, re-themed or given
-- a `wecom_userid` without touching `memberships`.
create trigger users_mirror_membership
  after insert or update of org_id, is_org_admin, disabled_at on public.users
  for each row
  execute function public.mirror_user_row_to_membership();

comment on function public.mirror_user_row_to_membership() is
  'Compatibility shim for the one release in which `users.org_id`/`is_org_admin` are still what the app writes and `memberships` is already what RLS reads. Dropped by the contract migration together with those columns — if it is still here after that, something still writes the old shape.';

-- ---------------------------------------------------------------------------------
-- `current_org_id()` reads the Membership
-- ---------------------------------------------------------------------------------
--
-- The one function the whole schema turns on. The policies are unchanged and do not need
-- to be: they were generated in one loop over `org_id = public.current_org_id()`, which
-- is exactly why moving the source of that answer is a function rewrite rather than
-- twenty hand edits.
--
-- Still SECURITY DEFINER with a pinned `search_path`, and now for a second reason as well
-- as the first: reading `memberships` inside a policy on `memberships` would recurse
-- into that policy the same way reading `users` inside a policy on `users` did.
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with live as (
    select m.org_id
    from public.memberships m
    join public.users u on u.id = m.user_id
    where m.user_id = auth.uid()
      and m.disabled_at is null
      -- `users.disabled_at` survives as the account-level gate: a Membership ending is an
      -- Org Admin's act inside their own org, and must not be able to switch off an
      -- account they do not own. Both have to be clear to read anything.
      and u.disabled_at is null
  )
  select coalesce(
    -- The Active Org, but only ever as a *selector* over Memberships actually held. A
    -- stale or forged value names an org the join does not produce, and names nothing.
    (select org_id from live
      where org_id = (select active_org_id from public.users where id = auth.uid())),
    -- And the answer for everybody who has not chosen, which today is everybody: when
    -- exactly one Membership is live it is not a choice, it is the only org there is.
    -- Safe by construction — this can only ever return an org already in `live`. When two
    -- are live and the Active Org resolves to neither, this is null and the caller reads
    -- nothing until the switcher writes a choice, which is the right way to fail.
    (select org_id from live where (select count(*) from live) = 1)
  )
$$;

comment on function public.current_org_id() is
  'The caller''s Active Org, or null if they are signed out, hold no live Membership, or hold several and have selected none. Every policy in this schema turns on it: `org_id = null` is null, never true, so a disabled member matches no row anywhere.';

-- ---------------------------------------------------------------------------------
-- `users` matches on the Membership too
-- ---------------------------------------------------------------------------------
--
-- Every other table in the schema carries `org_id` as its own column and needs no
-- change: `org_id = current_org_id()` is still exactly right for a Tender or a Quote,
-- and only the *source* of the right-hand side moved. `users` is the one table where
-- `org_id` meant "this person belongs to that org", which is the sentence the Membership
-- has now taken over — so this policy has to move off the column before the column can be
-- dropped, and doing it here rather than in the contract migration leaves that one a pure
-- deletion.
--
-- A SECURITY DEFINER helper rather than the `exists` inlined into the policy. Inlined, the
-- subquery on `memberships` is itself subject to `memberships`' policy, so reading `users`
-- would evaluate two policies deep on every row. That works — the recursion stops because
-- `current_org_id()` runs as the owner — but it is a shape nobody should have to re-derive
-- while checking whether org isolation holds. The schema already solved this once, the
-- same way, three functions up.
create function public.shares_current_org(candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = candidate
      and m.org_id = public.current_org_id()
  )
$$;

comment on function public.shares_current_org(uuid) is
  'Whether that person holds a Membership — live or ended — of the caller''s Active Org. Ended deliberately counts: Disabled colleagues are exactly who the People screen is opened to look at, and a Quote records who sourced it. Whether they can still *do* anything is `current_org_id()`''s answer about themselves, not this one about whether you may see them.';

revoke all on function public.shares_current_org(uuid) from public;
grant execute on function public.shares_current_org(uuid) to authenticated, service_role;

-- Replaced rather than added to: the old `using (org_id = current_org_id())` would keep
-- answering from the column until it was dropped, and a policy that agrees with its
-- replacement today is a policy nobody notices disagreeing with it tomorrow.
drop policy org_members_full_access on public.users;

create policy org_members_full_access on public.users
  for all to authenticated
  using (public.shares_current_org(id))
  with check (public.shares_current_org(id));

-- The RESTRICTIVE policy from 20260814030000 is untouched and still ANDs with this one:
-- reading stays org-wide, writing is your own row.

-- ---------------------------------------------------------------------------------
-- Who may read and write `memberships`
-- ---------------------------------------------------------------------------------
--
-- 20260814010000 argued that membership is not business data: `is_org_admin` is the
-- invite gate, `disabled_at` is the readmission gate, and a boolean you can set on
-- yourself is not a gate at all. Those columns are moving here, and the carve-out moves
-- with them — in the stronger form the new table makes easy. On `users` the rule had to
-- be written as a revoke plus a two-column grant, because members legitimately edit their
-- own `name` and `locale` on the same row. Nothing on a Membership is the member's to
-- edit, so this table is simply read-only to `authenticated`, and every write — inviting,
-- promoting, Disabling, switching — goes through a server action that checks
-- `is_org_admin` first and then writes with the service role.
alter table memberships enable row level security;

-- `for select`, where every other table in this schema carries `for all`. The difference
-- is the point: on the business tables "inside your org you read and write everything" is
-- the rule, and here there is nothing a member may write at all. Naming it
-- `org_members_full_access` like the others would put the schema's most load-bearing
-- table under a policy whose name says the opposite of what it does.
--
-- What it is *not* is a window into other organisations — `current_org_id()` answers with
-- one org, so a person holding two sees the Memberships of whichever one they are looking
-- at, which is the same sentence the Active Org is defined by.
create policy org_members_read_memberships on memberships
  for select to authenticated
  using (org_id = public.current_org_id());

comment on policy org_members_read_memberships on memberships is
  'Read-only on purpose, and paired with the revoke below rather than resting on it: RLS answers "which rows", GRANT answers "which verbs", and a member self-promoting must be refused by both.';

-- **The revoke is not belt-and-braces, it is the half that actually closes this.**
-- Supabase's own bootstrap sets `alter default privileges` on `public`, and the image
-- this repo runs locally still hands `authenticated` full DML on every table created
-- there. A new table is therefore born writable, and an added `grant select` is additive
-- rather than restrictive — written that way and `update memberships set is_org_admin =
-- true where user_id = auth.uid()` is one line from the browser console, which is the
-- exact hole 20260814010000 closed on `users` and the reason that file exists.
--
-- 20260825010000 says a new table's migration must grant for it in the same breath as it
-- writes its policy. This is the other half of that rule, and the one the schema had not
-- had to learn yet: state the floor as well as the ceiling.
revoke all on table public.memberships from anon, authenticated;
grant select on table public.memberships to authenticated;

-- The service role is the invite path, the setup path and the Disable action. It bypasses
-- RLS by design and is never exposed to a browser.
grant select, insert, update, delete on table public.memberships to service_role;

-- `current_org_id()` now reads two tables per call and is called once per policy per
-- statement. The unique constraint above already indexes `(user_id, org_id)`, which is
-- the lookup this makes; the org-side index is for the People screen, which reads every
-- Membership in one org.
create index memberships_org_id_idx on memberships (org_id);
