-- The Reporting Currency is the organisation's, and a Tender is stamped with it.
--
-- THB was not a display default, it was schema: a generated column called
-- `unit_price_thb`, a rate table whose column was `rate_to_thb`, and two `tender_items`
-- money columns whose currency existed only as a `-- THB` comment. A second customer
-- reporting in anything else would read every total on every screen in a currency they
-- do not trade in.
--
-- ADR-0036 decides where the currency lives. It is held on the organisation, in the
-- posture the FX Buffer already has — an Org Admin's setting rather than a deploy — and
-- **stamped onto each Tender when it opens**. Changing the setting changes what the next
-- Tender opens in and nothing about one that already exists, because `unit_price_*` is
-- generated over a Frozen Rate: the number would not move, only its unit would, and a
-- total relabelled into a currency its digits were never computed in breaks the Frozen
-- Rate's guarantee more quietly than one that moved.
--
-- The Tender rather than the Quote, because ranking happens *inside* a Tender Item: two
-- Quotes frozen against different Reporting Currencies in one sorted column are two
-- units drawn as one list.
--
-- ## Apply this one AFTER the merge, not before
--
-- README §"Deploying the schema" says to push migrations *before* merging, and gives the
-- reason: "A migration that only adds objects is forward-compatible — the deployed build
-- ignores what it does not call." **This migration is not one of those.** It renames
-- `quotes.unit_price_thb`, drops `fx_rates.rate_to_thb` and truncates that table, so the
-- build currently in production — which selects `unit_price_thb` on every Quote read —
-- stops working the moment this lands. Preview and production share one Supabase project,
-- so there is no staging copy to try it on first and `preview-schema.yml` cannot catch
-- it: that check probes for a database running *behind* its build, which is the opposite
-- fault and the safe direction.
--
-- So the order is inverted for this one, and the window is real either way:
--
--   1. Merge, and let Vercel finish deploying the build that reads `unit_price_reporting`.
--   2. Apply this migration.
--
-- Between those two steps production reads a column that is still called the old name and
-- serves fine; between them in the other order it reads one that is gone. The first window
-- is a deploy's length of nothing happening, the second is every Quote screen throwing.
-- `preview-schema.yml` will report `behind` on the pull request for exactly this reason —
-- that red is expected here, and it is the one case where it is not the fault it names.
-- It advises rather than blocks today, because `main` is not a protected branch yet and
-- so nothing is a required check; whoever turns that protection on (README §"Deploying
-- the schema" describes the setup) inherits this migration as the case that has to be
-- merged past a red status, and should read this block before assuming the check is
-- wrong.

-- The default is what backfills Taihue's row, and it is deliberately kept afterwards.
--
-- It is not, however, an answer for a *new* organisation. A customer who reports in SGD
-- and gets THB because Taihue did is the exact sentence this migration exists to delete,
-- so self-serve signup (#178) must ask rather than lean on this — the column comment
-- carries that obligation to the schema, where somebody building that screen will meet
-- it. It stays because the enforcement point is a screen that does not exist yet, and
-- dropping it today would buy nothing but eight broken test fixtures.
alter table orgs
  add column reporting_currency text not null default 'THB';

comment on column orgs.reporting_currency is
  'The currency this organisation''s comparisons and dashboard figures are displayed in, stamped onto each Tender as it opens. An Org Admin setting, like fx_buffer_pct — not a deploy. ISO 4217, and unconstrained here for the same reason `quotes.currency` is: the convertible list is ECB''s and lives in `src/lib/fx/currencies.ts`, where the picker and the server check read the one copy. SIGNUP MUST ASK: the default exists to backfill the first org, and a new customer silently inheriting THB is the bug this column was added to remove.';

-- Backfilled by the default, then the default is dropped: every Tender from here is
-- stamped by the trigger below, and a column that could quietly fall back to THB would
-- be a second answer to a question the organisation has already answered.
alter table tenders
  add column reporting_currency text not null default 'THB';

alter table tenders
  alter column reporting_currency drop default;

comment on column tenders.reporting_currency is
  'The Reporting Currency this Tender opened in, copied from the organisation at insert and never changed afterwards. Every figure under this Tender — each Quote''s converted price, the Landed Cost, the Selling Price — is in it, which is what lets a Working Sheet rank a column at all. Money is never summed across two of them.';

-- Stamped, not supplied — the same shape `assign_tender_reference` already uses, and for
-- the same reason: a value the caller sends is a value the caller can get wrong, and
-- there is exactly one right answer sitting on the org row. Whatever an insert supplies
-- is overwritten.
--
-- `security definer` so the read cannot fail for a reason the Owner could not act on.
-- Under the caller's own rights an unreadable `orgs` row would leave this null and
-- surface as a not-null violation, when the honest refusal is the one the `tenders`
-- insert policy is about to make anyway. Nothing leaks by it: the row this stamps is
-- refused by that policy unless `org_id` is the caller's own.
create function public.stamp_tender_reporting_currency()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select reporting_currency into new.reporting_currency
  from orgs
  where id = new.org_id;

  return new;
end
$$;

comment on function public.stamp_tender_reporting_currency() is
  'Copies the organisation''s Reporting Currency onto a Tender as it opens. Overwrites whatever the caller supplied rather than filling in a blank: the currency is the organisation''s answer, and honouring a client-supplied one is how a Tender ends up denominated in something no screen expects.';

revoke all on function public.stamp_tender_reporting_currency() from public;

create trigger tenders_stamp_reporting_currency
  before insert on tenders
  for each row execute function public.stamp_tender_reporting_currency();

-- `reference` is no longer the only column on this table that is written once and never
-- again, so the trigger that pins it becomes the place immutable Tender columns are
-- pinned. Renamed rather than joined by a second BEFORE UPDATE trigger, because two
-- triggers pinning two columns for one reason is a thing to keep in step for no benefit.
--
-- The argument in `20260814020000` for a trigger over a column GRANT carries over
-- unchanged: Postgres cannot revoke UPDATE on one column while UPDATE is held on the
-- table, so the alternative is re-granting the other eleven and remembering to add the
-- twelfth — and forgetting is silent.
drop trigger tenders_pin_reference on tenders;
drop function public.pin_tender_reference();

create function public.pin_tender_immutables()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.reference := old.reference;
  new.reporting_currency := old.reporting_currency;

  return new;
end
$$;

comment on function public.pin_tender_immutables() is
  'The columns a Tender keeps for life: `reference`, which the database issued, and `reporting_currency`, which the organisation answered when the Tender opened. Whatever an update sends, the row keeps both. Silent rather than an error, because the only way to hit it is to send a column you had no business sending.';

create trigger tenders_pin_immutables
  before update on tenders
  for each row execute function public.pin_tender_immutables();

-- The generated expression is unchanged — `unit_price * fx_rate_applied`, a frozen rate
-- times a stored price — and only the name stops claiming THB. Every existing row is
-- bit-for-bit what it was, which is what ADR-0018 requires of a Quote nobody edited.
alter table quotes rename column unit_price_thb to unit_price_reporting;

comment on column quotes.unit_price_reporting is
  'The Quote''s price in its Tender''s Reporting Currency, at the rate frozen onto this row when it was entered. Derived for comparison only: the supplier is paid in `currency`, and which of the two figures a screen leads with is that screen''s decision.';

-- `fx_rates` pivots on the euro, which is what ECB actually publishes.
--
-- `rate_to_thb` could only answer one question. Storing one EUR-relative row per currency
-- per day answers every pair from the same daily fetch — `per_eur[to] / per_eur[from]` —
-- so a second organisation reporting in SGD costs no extra rows and no extra requests.
-- The alternative, per-org rate rows, multiplies identical ECB data by the customer
-- count. The table stays global and unowned for the reason the v1 schema gives: an ECB
-- reference rate is the same for everyone.
--
-- The stored rows are deleted rather than converted, because converting them needs each
-- historical date's euro leg and this migration must not make network calls. Nothing
-- frozen is affected — a Quote carries its own rates and never re-reads this table. What
-- is lost is the fallback `freezeRate` uses when Frankfurter is unreachable, and it is
-- lost until the next daily run refills the table. A backfill script re-fetching the
-- historical dates can warm it sooner; the cron makes it moot within a day either way.
truncate table fx_rates;

alter table fx_rates
  drop column rate_to_thb,
  add column rate_per_eur numeric(18,8) not null check (rate_per_eur > 0);

comment on column fx_rates.rate_per_eur is
  'Units of `currency` per one euro, as ECB published them on `as_of`. The euro is the pivot because it is ECB''s own base, so every pair is a division of two rows from one fetch. Unlike the column it replaces, the reporting currency itself needs a row here — converting *into* it requires its euro leg — and so does EUR, whose row is 1.';

-- The two hand-entered money columns were never converted and never carried a currency
-- beyond a `-- THB` comment in the v1 schema. They are denominated in their Tender's
-- Reporting Currency by the same mechanism as everything else under it, which is why
-- this ticket needed no second one for them.
comment on column tender_items.landed_cost_per_unit is
  'What the Item actually costs us, per unit, in the Tender''s Reporting Currency — the Selected Quote''s converted price plus shipping, duty and handling. Hand-entered and never converted: see `tenders.reporting_currency`.';

comment on column tender_items.selling_price_per_unit is
  'What we bid back, per unit, in the Tender''s Reporting Currency. Hand-entered and never converted: see `tenders.reporting_currency`.';
