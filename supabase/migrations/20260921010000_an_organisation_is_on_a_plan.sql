-- An organisation is on a plan, and the plan is enforced where the work happens.
--
-- Until now nothing in the schema knew what a plan was. The free tier existed on a
-- pricing page and nowhere the app could read it, so the invite path would add any
-- number of people and the Working Sheet drew Margin for everybody. Ticket #179 gives
-- the organisation a plan and the app four places that read it; ADR-0040 records the
-- decisions this file makes.
--
-- **The limits live on the plan row, not in code.** The FX Buffer made this argument for
-- itself: a figure the business owns and will change without shipping code is a column,
-- not a constant. Changing what the free tier allows is `update plans set ...`, and it
-- takes effect on the next act. What *is* in code is the mechanism — which acts are
-- capped, and that a cap refuses the next act and never destroys data.
--
-- **What is deliberately not here.** Prices, tier names as a customer sees them, trial
-- length and founding-customer terms are commercial terms configured in Stripe (#180)
-- and never in this repository. The `free` row's figures are the product's public
-- promise, which the pricing page states in as many words; the `paid` row promises
-- nothing but "no cap", which is why every cap on it is null.

-- ---------------------------------------------------------------------------------
-- The plan
-- ---------------------------------------------------------------------------------
--
-- A `null` cap means uncapped, and there is no other way to say it: a cap must be at
-- least one, because a plan on which nothing may be opened is not a plan, it is a
-- closed account, and that is a different fact the schema does not yet have a word for.
create table plans (
  id                    text        primary key,
  open_tender_cap       integer     check (open_tender_cap > 0),
  membership_cap        integer     check (membership_cap > 0),
  photos_per_item_cap   integer     check (photos_per_item_cap > 0),
  money_layer           boolean     not null default false
);

comment on table plans is
  'What an organisation on this plan may do. One row per tier; the caps are the mechanism the app enforces, and their values are data rather than code so that changing a tier is not a deploy. Prices are not here and never will be: they are Stripe''s (#180).';
comment on column plans.open_tender_cap is
  'How many open Tenders the organisation may hold at once — open meaning no Outcome recorded, derived from the Items and never stored. Checked when a Tender is created and when a decided one is reopened. Null is uncapped.';
comment on column plans.membership_cap is
  'How many live Memberships the organisation may hold — live meaning not Disabled. Checked at Invite and at readmission. Null is uncapped. Stripe calls these seats; the glossary does not.';
comment on column plans.photos_per_item_cap is
  'How many Quote Photos one Tender Item may carry across all of its Quotes, and — since a Reference Image arrives on the Tender before it is placed on an Item — how many Reference Images a Tender may carry per Item it has. Checked when an upload is signed. Null is uncapped.';
comment on column plans.money_layer is
  'Whether the Working Sheet draws money at all: Landed Cost, Selling price, Margin, Coverage and the FX Buffer setting. Off, the Owner keeps the ranked Quotes and loses the columns — the same seam ADR-0020 draws per role, drawn per plan.';

-- The two tiers the launch ships with. The free row is the floor every organisation
-- starts on; the paid row is what a Stripe subscription (#180) moves an organisation to.
-- Both are data: a third tier is an insert, and a changed cap is an update.
insert into plans (id, open_tender_cap, membership_cap, photos_per_item_cap, money_layer)
values
  ('free', 1, 3, 5, false),
  ('paid', null, null, null, true);

-- Reference data with no owner, in exactly the posture `fx_rates` has: every signed-in
-- member may read the plans, because their own screens are shaped by one of them, and
-- nobody but the service role may write one. The revoke is the half that closes it —
-- the local image still hands `authenticated` full DML on a new table by default
-- (20260919000000 says why), and a plan a member could edit is a cap a member could lift.
alter table plans enable row level security;

create policy org_members_read on plans
  for select to authenticated
  using (public.current_org_id() is not null);

revoke all on table public.plans from anon, authenticated;
grant select on table public.plans to authenticated;
grant select, insert, update, delete on table public.plans to service_role;

-- ---------------------------------------------------------------------------------
-- The organisation's place on it
-- ---------------------------------------------------------------------------------
--
-- Added with `paid` as the default, backfilled, and then the default is changed to
-- `free`. The two defaults are two different sentences and both are true: an
-- organisation that existed before plans did was a customer already using everything,
-- and keeps it — this migration is not the moment anybody's Working Sheet loses its
-- Margin — while an organisation that signs up from here starts on the floor and pays to
-- leave it. Written as a default and a flip rather than an `update ... where`, because a
-- `where` would have to name a customer, and ADR-0039 took the last customer's name out
-- of the migrations on purpose.
--
-- `authenticated` cannot write `orgs` at all (20260814010000), so the column is written
-- by the service role and by nothing a browser holds. #180's webhook is the writer this
-- column is waiting for.
alter table orgs
  add column plan_id text not null default 'paid' references plans(id);

alter table orgs
  alter column plan_id set default 'free';

comment on column orgs.plan_id is
  'The plan this organisation is on. New organisations start on `free`; a Stripe subscription (#180) is what moves one to `paid`, and lapsing moves it back. Lapsing destroys nothing: an organisation over a cap keeps everything readable and loses only the ability to add, because every cap refuses the next act and never counts a stored total.';
