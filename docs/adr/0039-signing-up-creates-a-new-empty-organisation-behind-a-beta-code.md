# Signing up creates a new, empty organisation, behind a Beta Code

Ticket 178 ([#178](https://github.com/Mikepeerawit-com/awardley/issues/178)) builds the
sentence [ADR-0017](0017-the-first-org-admin-arrives-through-a-guarded-setup-screen.md)'s
amendment and the glossary's **Invite** entry committed to on 31 August 2026: *signing up
creates a new, empty organisation and never joins an existing one*. That amendment
recorded the direction and the reasoning; this ADR records what was built, the one
clause of the amendment that turned out wrong, and the gate the launch shape put in front
of it.

Until now there was no signup. The tenant row shipped inside the first migration —
`insert into orgs (name) values ('Taihue')` — and the first Org Admin arrived through
`/setup`, a screen guarded by a `SETUP_SECRET` and by `users` being empty, which read the
seeded org rather than creating one. That was the right shape for one installed customer
and is not a shape a stranger can buy. The launch, decided 15 September 2026, is a
**closed beta**: only an invited client can use the app, and everyone else joins the
waiting list on the landing page ([ADR-0035](0035-the-apex-is-the-shop-window-and-the-app-lives-next-door.md)).

## Decision

**An organisation comes into existence at `/signup`, in the app: one person fills in one
form, and a new organisation with nothing in it appears, with them as its first Org
Admin.** `src/lib/auth/signup.ts` is the only thing in the codebase that writes
`is_org_admin = true`, which `conventions.test.ts` holds it to, as it held `/setup`.

**Signing up never joins an existing organisation.** There is no organisation to choose
on the form, no lookup by name, and no branch that reads `orgs` before writing one. A
Membership of an organisation that already holds data is created by an **Invite** from
one of its Org Admins and by nothing else. The amendment's argument is unchanged and is
still the whole reason: inside an org RLS lets a member read every supplier's price and
every Margin, so a self-chosen "join" is not a limited account, it is the business.
Creating an empty organisation is safe for the same reason joining one is not — there is
nothing in it yet.

**During the closed beta the form asks for a Beta Code, held on the deployment as
`SIGNUP_CODE`.** It is one shared string the operator hands to each invited client, in
exactly the posture `SETUP_SECRET` had:

- **Unset means closed.** A deployment that forgets the variable gets a shut door rather
  than an open one — the only safe direction for that mistake to fail in, and every
  preview deployment shares production's database.
- **Checked before anything reaches the database.** Somebody without the code cannot
  drive service-role queries on a public route, and cannot learn whether an address
  already has an account. Compared in constant time, as the setup secret was.

**The seed row leaves the migration file.** Taihue's production row is data, not schema:
it stays exactly where it is, and nothing deletes it. What changes is that a fresh
database holds zero organisations until somebody signs up, which is what `npm run
db:reset` now produces, and `schema.test.ts` stops asserting a customer's name.

**`/setup` and `SETUP_SECRET` retire outright**, as the amendment said they would.

## The gate is the guest list, not the org boundary

It is worth being precise about what the Beta Code does and does not do, because the two
are easy to conflate and only one of them is security.

A stranger who somehow holds the code gets an empty organisation of their own and nothing
of anybody else's. What keeps them out of every other organisation is the grant on `orgs`
— `authenticated` holds `select` and nothing else, so a member cannot create one from the
browser's key — and the policy and revoke on `memberships`, which no member can write.
`rls.test.ts` asks both: a member and a signed-out caller each try to insert an `orgs`
row and are answered `permission denied`, by the grant and not by a policy that might
have let the row through and hidden it afterwards. The Beta Code is not in that chain and
must never be leaned on as if it were.

What it *is* is the beta's guest list: the thing that makes "only invited clients" true
without a second table, a second admin surface, or a second kind of invitation beside the
one the glossary already has. It rotates by changing the variable and redeploying. **Open
self-serve signup, when it comes, is the removal of this check and nothing else.**

## What it writes, and in what order

Four writes, ordered so that the likely refusal is the cheap one. The auth account goes
first, because "that address already has an account" is the one failure a real person
hits, and refusing it before an `orgs` row exists leaves nothing to undo. Then the
organisation, with its **Reporting Currency written from the form** — the column comment
added by [ADR-0036](0036-a-tender-is-priced-in-the-currency-it-opened-in.md) said signup
must ask, and this is that screen. Then the profile row, with its **Active Org** pointing
at the organisation just made ([ADR-0037](0037-the-active-org-is-a-row-and-a-membership-is-what-makes-it-true.md)).
Then the Membership carrying `is_org_admin`.

Each later failure undoes everything before it, so the database is left holding all four
rows or none. An organisation with no Membership is a row nobody could ever reach; a
profile with no Membership is an account that can hold a password and read nothing. The
undo goes profile, organisation, auth account — the profile points at the organisation,
and the Membership goes with the profile by cascade.

`email_confirm` is set at creation, as `/setup` set it, and it is a trade rather than an
oversight: the person typed the address and the password into the same form, so a
confirmation round trip would prove ownership of the address and nothing else, and during
the beta the code has already been handed to a known person. The cost is that somebody
holding the code could sign up with an address that is not theirs and hold an empty
organisation under it; the real owner would learn of it only by being refused
`email_taken`. That is the same exposure `/setup` had, narrowed to the guest list, and it
is named here so that open self-serve — where the guest list is gone — knows it inherits
the question rather than an answer.

## Why not the alternatives

**A per-client, single-use token in a table** is the stronger gate and was rejected for
the beta. It needs a table, a way to mint rows, a way to see which were used, and a
second kind of invitation living beside the **Invite** the glossary already defines —
for a guest list of about ten companies, whose whole purpose is to disappear. If a leaked
code ever matters, the shape is known and the swap is one function; nothing else in the
form or the write changes.

**Flipping `enable_signup` to `true`**, which the amendment said would become safe, does
not happen, and the amendment was wrong about it in a way worth recording. The platform's
own `/auth/v1/signup` creates an auth account and nothing else. An account it created
would hold no profile and no Membership, read nothing, and be un-invitable — the exact
half-account the invite and signup paths each undo when a later write fails. The app
creates the account itself, through the service role, so the platform flag stays `false`
and `conventions.test.ts` keeps asserting `signup_disabled`. That is not a relaxation of
the amendment's argument; the argument was about *which org* an account lands in, and the
answer is still "a new one".

**Keeping `/setup` as a self-hosted fallback** was the other reading the ticket allowed.
It would have kept a second public route that mints an Org Admin, a second env secret,
and a suite that could only run by emptying `users`, for a self-hoster who can use
`/signup` with a code of their own choosing and get the same account. Two doors that do
the same thing is one more than the argument in ADR-0017 was willing to defend.

**Deleting the production row by migration** was never on the table; **a new migration
to remove the seed** was, and is not needed. The health probe compares migration versions
against `supabase_migrations.schema_migrations`, never file contents, so editing the
applied file leaves the hosted history and the checkout in agreement. The edited file
carries the reasoning at the place the line was.

## What must not be quietly undone

- **An unset `SIGNUP_CODE` means closed.** `requiredEnv` is deliberately not used in
  `signup.ts`: a missing value is a shut door, not a crash and not an open one.
- **The code is checked before the database is touched**, and the currency after it but
  still before. Reordering either lets an unauthenticated caller drive service-role
  queries, or lets a typo lock a person out of their own address.
- **Nothing on the form names an organisation that already exists.** The day the form
  grows an org id, a name lookup, or a "join" branch, the sentence this ADR exists for is
  false. `signup.test.ts` asks it in the strongest form available: two people naming
  their organisation identically get two organisations, and neither can read the other's.
- **`is_org_admin` is written only on the Membership of the organisation just created.**
  Writing it anywhere else is promotion with no gate; promotion stays an `update` from
  the Supabase dashboard (README §6).
- **The Reporting Currency is asked, never defaulted.** The picker has a required
  placeholder rather than a preselected value, and `signUp` refuses a currency outside
  the convertible list before writing. A form that quietly preselected THB would
  reintroduce the bug ADR-0036 was written to remove.
- **`enable_signup` stays `false`** at the platform, for the reason above.
- **The grant on `orgs` stays `select` only for `authenticated`.** It is the org
  boundary's first half, and the reason the Beta Code does not have to be one.

## Consequences

- **README §6 describes signup**, and `SETUP_SECRET` leaves `.env.example` and the
  deployment. `SIGNUP_CODE` replaces it on Production, and on Preview if a preview should
  be able to sign somebody up; unset there means a closed notice, which is fine.
- **`npm run db:reset` produces a database with no organisation**, and `/signup` with any
  local `SIGNUP_CODE` makes the first. The `no_org` refusal, the withheld-table exclusive
  suite and the seed assertion in `schema.test.ts` all go with the seed.
- **The timezone is not asked**, and a new organisation gets `Asia/Bangkok` by the
  column's default. That is the same guess this ADR removes for the currency, one
  question over, and it is left because no screen anywhere can change it yet either —
  #182 is where the timezone stops being assumed, and asking it at signup belongs with
  that work rather than ahead of it. `signup.test.ts` reads the default back so that the
  day it changes, the line has to change with it.
- **The landing page still does not link to `/signup`.** ADR-0035's rule was about a
  signup that did not exist; the one that exists is gated, and a public "Get started"
  pointing at a code-guarded form invites people to try codes. The waiting list stays the
  only call to action until the gate goes.
- **The address-ownership question is inherited by open self-serve**, named above, and
  is the one thing this ADR expects its successor to answer.
