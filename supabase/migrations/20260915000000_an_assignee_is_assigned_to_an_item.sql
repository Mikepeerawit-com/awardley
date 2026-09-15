-- An Assignee is assigned to a Tender Item, not to a Tender (ADR-0033).
--
-- The Tender-level join was the single line of schema that made this Taihue's app
-- rather than the trade's. Taihue competes — several people on one Tender, each
-- sourcing every Item they can, because comparing their Quotes is the point — and the
-- old table said so structurally: being on the Tender meant being on all of it. Most
-- companies divide instead, one product to one person, and for them the old shape had
-- no sentence at all.
--
-- Assignment therefore moves down one level, and both ways of working fall out of one
-- model with no mode, no flag and no setting: several Assignees on one Item is
-- competing, one Assignee per Item is dividing, and one Tender may do both. The
-- cardinality of the rows *is* the answer. A `sourcing_mode` column on `orgs` was
-- rejected in ADR-0033 as two code paths through every feature that reads assignment,
-- forever, in a product with one developer.
--
-- The shape copies `no_supplier_found`, which was already per Item per user — the row
-- this table's rows are answered by.
create table tender_item_assignees (
  tender_item_id  uuid not null references tender_items(id) on delete cascade,
  user_id         uuid not null references users(id),
  org_id          uuid not null references orgs(id),
  created_at      timestamptz not null default now(),
  primary key (tender_item_id, user_id)
);

comment on table tender_item_assignees is
  'Who is sourcing which Tender Item. Several rows on one Item is competing, one per Item is dividing, and nothing asks an organisation which it does (ADR-0033). An Item with no rows is Nobody Sourcing — derived, never stored, and shown on the Tender as work outstanding.';

-- The same one-policy-per-table shape every org_id-carrying table took in the v1
-- schema's loop, written inline because that loop ran once, for its own list.
alter table tender_item_assignees enable row level security;

create policy org_members_full_access on tender_item_assignees
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- And the grants, in the same breath as the policy — 20260825010000 is explicit that
-- future tables inherit nothing. The verbs mirror what `tender_assignees` held:
-- membership of an Item is the org's own business data, scoped by RLS.
grant select, insert, update, delete on table tender_item_assignees to authenticated;
grant select, insert, update, delete on table tender_item_assignees to service_role;

-- The backfill is a cross product, and it is the honest one. Under competing, a
-- Tender-level row already meant "every Item on this Tender", so each `(tender_id,
-- user_id)` becomes one row per Item — nobody gains or loses work, and the migration
-- is reversible by collapsing back to the distinct `(tender_id, user_id)` pairs.
-- `created_at` carries over: the day you were put on the Tender is the day you were
-- put on its Items, because that is what the old row meant.
insert into tender_item_assignees (tender_item_id, user_id, org_id, created_at)
select ti.id, ta.user_id, ta.org_id, ta.created_at
  from tender_assignees ta
  join tender_items ti on ti.tender_id = ta.tender_id;

-- Replaced, not deprecated. Two assignment tables would be two answers to "who is on
-- this?", and the schema test's absent-columns posture applies to absent tables too:
-- the old shape must not survive to disagree with the new one.
drop table tender_assignees;
