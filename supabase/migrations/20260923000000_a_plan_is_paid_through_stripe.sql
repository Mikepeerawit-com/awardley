-- A plan is paid through Stripe, and the app never touches a card.
--
-- #179 gave the organisation a plan and four places that read it, and left the only
-- question that matters unanswered: what moves an organisation from `free` to `paid`.
-- The answer is a Stripe subscription, and this migration is the five columns the app
-- needs to hold what Stripe has already decided.
--
-- **Stripe is the source of truth; these columns are a read model.** Nothing here is a
-- fact the app owns. The webhook never trusts an event payload: on any
-- subscription-shaped event it re-reads the subscription from Stripe and writes absolute
-- state into this row, which is what makes a replayed event and an out-of-order delivery
-- harmless by construction rather than by a table of event ids nobody prunes. Read that
-- way, every column below is a cache with one writer, and the recovery from any
-- disagreement is to re-read Stripe rather than to reason about what happened.
--
-- **What is deliberately not here.** Prices, tier names as a customer sees them, trial
-- length, currency and founding-customer terms are commercial terms configured in Stripe
-- and never in this repository — the same sentence the #179 migration wrote about the
-- `plans` rows, kept. The one place a number from Stripe lands is `paid_memberships`,
-- and it lands because the app has to *enforce* it, not because the app decided it.
--
-- `authenticated` cannot write `orgs` at all (20260814010000), so every column here is
-- written by the service role and by nothing a browser holds. No grant or policy changes:
-- a member may already read their own org's row, and none of these values is a secret —
-- a Stripe customer id is an identifier, not a credential, and the keys that can act on
-- one live in the environment.

alter table orgs
  add column stripe_customer_id         text unique,
  add column stripe_subscription_id     text unique,
  add column stripe_subscription_status text,
  add column paid_memberships           integer check (paid_memberships > 0),
  add column trial_ends_at              timestamptz;

comment on column orgs.stripe_customer_id is
  'The Stripe Customer this organisation bills as, created the first time it is needed and kept for life. Unique, because two organisations sharing one Customer would each be answered for by the other''s subscription. Null until somebody first starts a checkout or opens the billing portal.';

comment on column orgs.stripe_subscription_id is
  'The Stripe Subscription that pays for this organisation, or null when none does. Unique for the same reason the customer id is. It is kept after a subscription ends — Stripe keeps the object, and so does this row, so a lapse is a status rather than an erasure.';

comment on column orgs.stripe_subscription_status is
  'Stripe''s own word for where the subscription stands — `active`, `trialing`, `past_due`, `canceled` and the rest — stored verbatim and with no CHECK, because the vocabulary is theirs and a constraint here would turn a word they add into a write that fails. What the app does with it is one mapping in `subscription.ts`: the paying words move the org to `paid` and every other word moves it to `free`.';

comment on column orgs.paid_memberships is
  'How many people the subscription pays for, as Stripe reports the quantity on it — null when no subscription does. It is the tighter half of the organisation''s cap on live Memberships: the plan row says what the tier allows and this says what was bought, and the effective cap is whichever is smaller. Stripe calls these seats; the glossary does not. At least one, because a subscription paying for nobody is not a subscription.';

comment on column orgs.trial_ends_at is
  'When this organisation''s free trial ends, set once and kept afterwards as history. A trial is a plan state and not a subscription: `plan_id = ''paid''` with this set and no `stripe_subscription_id`, taken without a card, and the daily cron moves the org back to `free` on the day it passes. Non-null therefore means the trial has been used, whether or not it is still running — which is what makes it once per organisation.';
