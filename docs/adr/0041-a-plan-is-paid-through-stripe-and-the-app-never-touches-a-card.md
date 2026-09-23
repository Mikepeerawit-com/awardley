# A plan is paid through Stripe, and the app never touches a card

Ticket 180 ([#180](https://github.com/Mikepeerawit-com/awardley/issues/180)) is the
plumbing under ADR-0040's plan. That ADR put a **Plan** row on every organisation and
four places that read it, and left the column waiting for a writer: nothing yet moved an
organisation from `free` to `paid` but SQL. The commercial terms — prices, tier names as
a customer sees them, trial length, founding-customer terms — were decided on 15
September 2026 and are deliberately not in this repository. They are configured in
Stripe, and what belongs here is the plumbing that reads them back.

## Decision

**Stripe Checkout and Stripe's Customer Portal, per-user pricing, and the app never sees
a card.** An Org Admin who subscribes is sent out to a Checkout session Stripe hosts and
comes back; one who changes the number of people paid for, the card, or cancels, is sent
out to the Portal and comes back. No card number, no billing address and no invoice ever
passes through this code, which is what keeps the app out of PCI scope and out of the
business of building a billing screen Stripe already has.

**Stripe is the source of truth; `orgs.plan_id` is a read model of it.** The webhook at
`/api/stripe/webhook` is the one writer of everything billing-shaped on `orgs`: the
plan, the subscription's id and status, and how many live Memberships it pays for. The
app reads those columns the way it reads any other setting, and writes them nowhere else
— with the one exception below, which is precisely the state Stripe does not hold.

**The webhook re-reads before it writes.** Stripe signs what it sends but does not
promise to send it once, or in order: a `customer.subscription.updated` from before a
cancellation can arrive after the `deleted`. So the handler treats the event as a hint.
It takes the subscription's id out of the event, retrieves that subscription from Stripe
*now*, and writes the answer as an absolute state — plan, status, quantity — in one
update. A replayed event re-reads the same truth and writes the same row; a late one
re-reads a newer truth and cannot roll anything back. That is the whole of the
idempotency and replay posture, and it is why there is no table of processed event ids
to keep and prune. It is the Reminder sender's instinct, catch up rather than skip,
applied to a webhook: the event says *something changed*, and the answer to that is
always to look.

One ordering the re-read cannot repair on its own: cancel, subscribe again, and the old
subscription's `deleted` lands after the new one's `created`. Re-reading the old one
truthfully says `canceled` — about a subscription that is no longer the organisation's.
So a lapse is applied only by the subscription the row names (`superseded` otherwise),
while a paying snapshot always applies, because paying is the newer fact whichever
subscription says it. And the one fault a redelivery *does* fix — Stripe or Postgres not
answering — is the one the route answers with a 500, so that Stripe's retries catch up;
everything else is a 200, refusals included.

A paying organisation is refused a second Checkout (`already_paying`), judged on Stripe's
status word and never on the quantity, because a second Checkout for the same Customer
is a second subscription billed for the same colleagues. What a paying organisation
changes, it changes in the Portal.

**`past_due` stays paid, and the grace period is Stripe's.** The ticket asked what the
app does when a payment fails. Stripe's own retry schedule and its "cancel after N
failures" setting are the grace period, configured in the Dashboard beside the prices
they belong with. While Stripe is retrying, the subscription reports `past_due` and the
organisation stays on `paid`; the day Stripe gives up it reports `canceled` or `unpaid`,
and the organisation lapses to `free` under ADR-0040's rules — read-only surplus, nothing
deleted. The mapping is one function, `subscriptionPlan`: `active`, `trialing` and
`past_due` are paid; everything else, including a status this code has never heard of,
is free. Unknown falls closed for the reason `noPlan` allows nothing.

**Paid seats are a second cap on the count an Invite already makes.** ADR-0040 left it
open whether the quantity a subscription pays for overrides the plan row's
`membership_cap` or writes to it. It overrides: the row is shared reference data, one
per tier, and a quantity written to it would be one organisation's purchase applied to
every organisation on that tier. So `orgs.paid_memberships` holds the quantity, and
`membershipCapReached` asks `effectiveMembershipCap(plan, paidMemberships)` — the
tighter of the two, null meaning uncapped on either side. The `paid` row's cap is null,
so on it the seats are the cap; on a capped row the row still wins if it is lower. One
check, in the one place it already was.

**A Trial is a plan state, not a Stripe subscription.** The ticket's card-less trial is
`plan_id = 'paid'` with `orgs.trial_ends_at` set and no subscription: exactly the shape
ADR-0040 said to start from. An Org Admin starts it from the Plan screen, once — a
non-null `trial_ends_at` is the record that it was used, and it is kept after the trial
lapses so that it cannot be used twice. How long it runs is read off the Stripe Price's
`recurring.trial_period_days` at the moment it starts: a term configured in Stripe, read
back, and never a figure in this repository. If the price carries no trial the button
refuses with `no_trial`, and the screen has offered nothing it cannot deliver.

The daily cron is what ends it. `lapseExpiredTrials(at)` runs first in `runDailyCron`
and puts every organisation whose `trial_ends_at` has passed, and which holds no
subscription, back on `free`. That is the one write to the plan column that is not the
webhook's, and it is the only one because it is the only billing fact Stripe does not
hold. The window it leaves — a trial ends at the next morning run rather than at the
second it expires — is a day at most and is stated on the screen as the day the trial
ends. Converting is the webhook's job: a paying subscription applied to an organisation
clears `trial_ends_at`, and Checkout for a trialling organisation never sets a Stripe
trial, because the card-less one was the trial.

## What the screen does and does not say

The Plan screen is the fourth row of Settings' **Organisation** group, and only an Org
Admin has it — billing is the definition of a change that lands on everybody's screen.
It says which plan the organisation is on in plain words, when the Trial ends or ended,
how many people the subscription pays for and how many of those are in use, and that the
last payment did not go through when it did not. It does not name a tier, quote a price,
or count down a trial in hours: the names and the prices are Stripe's, and Checkout is
where a customer reads them. Three buttons — start the free trial, subscribe, manage
billing — each leave for Stripe and come back to this screen.

## Why a boundary and not a mock

Stripe is the project's fourth stubbed outbound boundary, beside the WeCom robot, the
Resend send and the Frankfurter fetch, and for the same reason those three are injected
rather than stubbed globally (ADR-0012): the code that talks to Stripe also talks to
Postgres over HTTP, and a global `fetch` stub takes `supabase-js` down with it. The
boundary is a small typed interface — retrieve a subscription, retrieve a price's trial
days, create a customer, a Checkout session, a Portal session — and every test stands at
it with a fake that records what it was asked. The route handler alone builds the real
one, because a route handler has nowhere to take a boundary as an argument, and its own
test proves only the signature check, against an event type nothing listens to.

## What must not be quietly undone

- **The webhook never writes what the event says.** Applying the payload directly is
  one line shorter and reintroduces every ordering bug the re-read exists to prevent.
- **Unknown statuses lapse.** A status this code does not recognise is not a paying
  customer; making the default `paid` turns Stripe adding a status into a free upgrade.
- **`paid_memberships` is null when there is no paying subscription.** A stale quantity
  left behind on lapse would cap a free organisation by a number it stopped paying for,
  or uncap it on a plan row that meant to cap it.
- **`trial_ends_at` survives the lapse.** Clearing it makes the trial repeatable.
- **The cron lapses only organisations with no subscription.** A trial that converted has
  its date cleared by the webhook, but the guard is on the cron too, because a webhook
  that has not arrived yet is the ordinary state of the world for a few seconds.
- **Every answer past the signature check is a 200, except a write or read that did not
  answer.** A 5xx for an event nothing listens to, or a customer nothing maps to, is
  retried by Stripe for days and comes right on none of the attempts; a 200 for a
  database that was down skips the event for ever. `webhookStatus` holds the line.
- **A lapse is applied only by the subscription the row names.** Dropping the
  `superseded` guard lets an old subscription's ending cancel a new one's paying.
- **"Already paying" is judged on the status, never on the quantity.** A paying
  subscription with no quantity must still be refused a second Checkout.
- **The three environment variables fail closed.** No webhook secret refuses every
  delivery with a 404; no price id refuses Checkout; nothing defaults to open.
