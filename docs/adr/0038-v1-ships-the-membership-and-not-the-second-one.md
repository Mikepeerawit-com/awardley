# v1 ships the Membership, and not the second one

Ticket 177 ([#177](https://github.com/Mikepeerawit-com/awardley/issues/177)) builds
**Membership** and **Active Org**, two glossary entries that have been settled language
and unwritten code since the terms were written down. The glossary permits a person to
hold several Memberships. The question this ticket had to answer is whether v1 *ships*
that, or only the shape that permits it later.

**v1 ships the shape, the Active Org and the switcher. It ships nothing that creates a
second Membership.** Every person in the database holds exactly one row, and the control
that changes the Active Org therefore renders for nobody.

## Why the machinery is built for users who do not exist

This looks like the speculative generality the repo usually refuses, and the distinction
worth naming is that **the mechanism is not speculative — the second row is.**

`current_org_id()` is read by every policy in the schema. Building it to resolve one
Membership now and rewriting it to resolve several later means touching org isolation
twice, and the second time under whatever pressure #178 arrives with. The function that
handles several handles one as a special case of itself; there is no simpler version of it
that is also a version anyone would keep.

The switcher is the same argument one layer up. Its rule — render only for people holding
more than one Membership — is a rule with a checkable answer today: it renders for nobody,
which is the correct output, and a test can say so. Written later, it is a new control
introduced at the same moment as the first user who needs it, with nothing to compare
against.

What is *not* built is the part that would be a guess: how somebody comes to hold a second
Membership. That is a product question — an Org Admin inviting a person who already has an
account, or signup joining an existing organisation, or neither — and the glossary
currently says an Invite grants Membership of *their* organisation while signup creates a
new empty one and never joins an existing one (ADR-0017). Nothing in v1 needs to cross
that line, so nothing in v1 does.

## Why both glossary markers come off anyway

**Membership** and **Active Org** each carry a `_Not built yet_` line, and by the
glossary's own rule (CONTEXT.md line 16) those come off when the code lands. The rule
exists because a reader has to be able to trust every unmarked entry as true of the
running app.

**Membership**'s marker comes off plainly: the table exists, an Invite creates the row,
Disabling ends it, RLS reads it, and admin of one organisation grants nothing anywhere
else — all six clauses of the entry are now true.

**Active Org**'s marker is the interesting one, because its text is *"there is nothing to
switch between until a Membership can be held twice."* That sentence describes the
situation this ticket leaves in place, so it would be fair to reword rather than remove
it. It comes off because the entry it marks does not promise a second organisation — it
promises that the session has one Active Org, that everything on every screen is scoped to
it, and that **the control does not render at all for the overwhelming majority who hold
exactly one Membership.** Every one of those is now true of the running app, including the
last, which is true in the strongest possible form.

An entry describing a control that renders for nobody is not describing behaviour the app
lacks. It is describing behaviour the app has, in a population of one organisation.

## What follows from it

- **The switcher's condition is "more than one live Membership", not a feature flag.** It
  is the glossary's sentence written down once. When the first person holds two, the
  control appears because the condition became true, with nothing to turn on.
- **`memberships` is the shape a seat count reads.** #179 asks how many people are in an
  organisation, and the answer is rows in this table rather than a query that has to know
  `users.org_id` means membership. `created_at` was carried across in the backfill for
  exactly this reason, rather than defaulting to migration day.
- **Nothing asserts that a person holds one Membership.** No unique constraint on
  `user_id`, no check, no application rule. The invariant is a fact about today's data,
  not a rule the schema enforces, because enforcing it is the thing that would have to be
  undone.
- **The one-Membership case has no fast path.** `current_org_id()` resolves it through the
  same query as any other, so the case everybody is in is the case that is exercised.

## What this deliberately does not solve

There is no way to give somebody a second Membership from inside the app. Making one
requires a row written by hand, the way a second Org Admin already does (README §6).

That is the honest state: the model permits it, the machinery handles it, and the product
has not yet decided what act creates it. #178 is where that decision naturally lands,
because self-serve signup is the first thing that makes a second organisation exist at
all.
