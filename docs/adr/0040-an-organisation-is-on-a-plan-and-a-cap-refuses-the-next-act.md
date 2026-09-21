# An organisation is on a plan, and a cap refuses the next act

Ticket 179 ([#179](https://github.com/Mikepeerawit-com/awardley/issues/179)) gives the
organisation a **Plan** for the first time. Until now nothing in the schema or the code
knew what one was: the free tier existed on a pricing page and nowhere the app could
read it, so an Invite would add any number of people and the Working Sheet drew Margin
for everybody. The commercial terms — prices, tier names as a customer sees them, trial
length, founding-customer terms — were decided on 15 September 2026 and deliberately kept
out of this repository; they are Stripe's, and #180 builds the plumbing that reads them
back. What belongs here is the *mechanism*: a plan on the organisation, and the small
number of places that read it.

## Decision

**A plan is a row, and the organisation points at it.** `plans` holds one row per tier
with the caps as columns — `open_tender_cap`, `membership_cap`, `photos_per_item_cap`,
`money_layer` — and `orgs.plan_id` names one. The launch ships two rows, `free` and
`paid`; a third tier is an insert, and a changed cap is an update.

**The values live on the row, not in code.** This is the FX Buffer's argument made again
(buildspec_2 A3, ADR-0018): a figure the business owns and will change without shipping
code is a column, not a constant. The free tier's caps are the product's public promise
and will move as the product does; a deploy per movement would make the tier a property
of the build rather than of the business. Nothing in `src/` knows what the free tier
allows. The one fallback in code, `noPlan`, allows *nothing* — zero on every cap and no
money — so that an unreadable row fails as a refusal somebody reports rather than as a
free upgrade nobody notices, and so that no tier's numbers exist anywhere but the table.

**A cap refuses the next act and never destroys data.** Every check asks one question,
`capReached(cap, count, adding)`: would this add cross the line. The count is derived from
the rows each time — open Tenders are the ones with no Outcome, exactly as the Tender
list means it (ADR-0001); live Memberships are the ones not Disabled; photos are counted
off the rows that point at them — and there is no stored counter to drift. Four acts are
capped, and they are the four acts that *add*:

- **Opening a Tender**, at `createTender` — and at `setItemOutcome` when clearing the
  last Outcome on a decided Tender, because that reopens it. Clearing an Outcome on a
  Tender that is already open adds nothing and is never refused.
- **Inviting**, at `invite` — and at readmission, because a Disabled colleague coming back
  is a live Membership the organisation did not have. Disabled Memberships do not count:
  a person who cannot sign in occupies nothing.
- **Signing an upload**, at both `sign*Uploads`. A Quote Photo counts against the Tender
  Item its Quote is for, across every Quote on that Item. A Reference Image arrives on the
  Tender and is placed on an Item afterwards or never (**Unassigned**), so the per-Item
  cap cannot be asked of it at upload, which is the moment the ticket says to ask; the
  Tender's allowance is the per-Item cap times its Items, the same promise kept at the
  grain the act happens at. Recording an upload is not re-checked: the count was made when
  the token was minted, and refusing after the phone has uploaded would refuse pictures
  already in Storage.
- **Drawing and writing money**, at the ADR-0020 seam. The Working Sheet's money columns,
  Landed Cost, Selling price, Margin, Coverage and the FX Buffer setting render and write
  only when the plan has the money layer. The ranked Quotes, the conversion into the
  Reporting Currency, selection and ruling out all stay: the free tier keeps the whole
  sourcing mechanism and loses the money.

## What lapsing means

The ticket named it as the decision this ADR had to make: what paid → free means for an
organisation already over the caps. **Read-only surplus**, and it costs no code, which is
the reason the checks are phrased about the next act rather than about the current
state. An organisation lapsing with six open Tenders keeps all six readable, every Quote
and every photo on them, and loses only the ability to open a seventh until one is
decided. Nothing is deleted, hidden behind a paywall, or locked. The one thing that does
disappear from the screen is the money layer, and that is a *rendering* of figures that
stay in the rows: the Landed Costs entered while paid are still there the day the
organisation pays again.

The alternative — enforcing the cap on the stored state, so that an over-cap organisation
is refused everything until it deletes down to the line — was rejected because it makes
the app destroy or demand destruction of a customer's records to be allowed to use it.
Users are never deleted (**Disabled**, CONTEXT.md); Tenders should not be either.

## Existing organisations are grandfathered

The migration adds `plan_id` with `paid` as the default, backfills, and then flips the
default to `free`. The two defaults are two different sentences and both are true: an
organisation that existed before plans did was a customer already using everything, and
keeps it — this migration is not the moment anybody's Working Sheet loses its Margin —
while an organisation that signs up from here starts on the floor and pays to leave it.
It is written as a default and a flip rather than an `update ... where name = ...`
because a `where` would have to name a customer, and ADR-0039 took the last customer's
name out of the migrations on purpose.

## Where the money gate lives, and why it is a prop and not a third shape

ADR-0020 made the tender detail's shape a discriminant — `comparison` for the Owner,
`sourcing` for everybody else — and argued that what is not in the payload cannot be
drawn by mistake. The plan gate reuses that seam rather than inventing a second way to
hide a figure, and it does so as a boolean on the `comparison` shape with the money
fields *nulled* rather than as a third shape. The Owner on a free plan is looking at the
same screen as the Owner on a paid one with three columns and a totals bar missing; a
third shape would be the comparison shape with fields removed, which is exactly the
"a `SheetItem` with fields removed" that `SourcingItem`'s comment refuses to be. The
figures are still subtracted from the payload, so the rule ADR-0020 states holds: the
sheet cannot draw a Margin it was not handed.

The writes are gated too — `setLandedCost`, `setSellingPrice`, `setFxBuffer` refuse
`not_on_plan` — because a server action is a public endpoint, which is the sentence every
gated write in this repo already opens with.

## Not enforced in RLS, deliberately

Org isolation stays exactly as it is: one policy per table on `current_org_id()`,
fail-closed. A plan is a limit on what an organisation may *add*, inside its own rows, and
expressing it as policy would mean an insert policy that counts sibling rows on every
statement, and a money-layer policy that hides columns from a role that can otherwise
read the table. Both are how a fail-closed model turns into a maze (ADR-0020). The checks
live in the query layer beside the Owner check, where `mayCorrectQuote` and `ownsTender`
already are, and `plans` itself is reference data in exactly `fx_rates`' posture:
readable by every member because their screens are shaped by it, writable by nobody a
browser holds.

## What this leaves for #180

- `orgs.plan_id` is the read model; Stripe is the source of truth and its webhook is the
  one writer. `authenticated` cannot write `orgs` at all (20260814010000), so the column
  is service-role territory already.
- A trial without a card is a plan state with an expiry, per the ticket. It is not a
  third `plans` row here, because nothing yet expires anything; when #180 adds the
  expiry, `paid` with a date is the shape to start from.
- The seat count a subscription pays for is a cap on the same count `invite` already
  makes. `membership_cap` on the row is the launch's version of it; #180 decides whether
  the paid quantity overrides the row or writes to it.

## Consequences for tests

A fresh organisation is on `free`, and `free` holds one open Tender. Every suite that
creates an organisation and opens several Tenders in it now has to put that organisation
on a plan that allows it — the suites reference the seeded `paid` row, or insert a
run-scoped plan row of their own and delete it after the organisations that point at it.
Sixty-eight tests in six suites that had nothing to do with plans discovered this on the
day the cap landed, and the fix was the fixture every time, never the check. The seeded
`free` and `paid` rows are never written by a test: suites run in parallel, and a cap one
suite loosened is a cap another suite was in the middle of asserting.

## What must not be quietly undone

- **Every plan read fails closed.** A count that came back null, an Item list that could
  not be read, a plan row that could not be embedded: each is answered as the cap being
  reached. A check that fails open is a cap nobody can tell from a lifted one.

- **`noPlan` allows nothing.** Making the fallback the free tier is one line, puts a
  tier's numbers back in code, and makes an unreadable row indistinguishable from a
  customer on the floor.
- **The checks count rows, never a counter.** A `tenders.open_count` is the kind of
  column ADR-0001 exists to refuse.
- **Recording an upload is not re-checked.** The refusal is at signing; a second check at
  `record*` refuses pictures the phone has already sent.
- **The migration's two defaults are both load-bearing.** Collapsing them to `free` strips
  every existing customer's money layer on deploy.
