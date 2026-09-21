# The Active Org is a row, and a Membership is what makes it true

Ticket 177 ([#177](https://github.com/Mikepeerawit-com/awardley/issues/177)) moves
`org_id` and `is_org_admin` off the `users` row into **memberships**, so that a person may
hold a place in more than one organisation. The moment they can, a session has to say
which organisation it is looking at — the **Active Org** — and something has to hold that
answer.

The Active Org is **a column on the `users` row**, `users.active_org_id`. It is never
trusted on its own: `current_org_id()` answers with it only when a live Membership backs
it, and otherwise answers with nothing.

## Why not a cookie

`current_org_id()` is not application code. It runs **inside every row-level security
policy in the schema** — the policies were generated in one loop over `org_id =
public.current_org_id()`, and `orgs`, `users` and the Storage paths read it too. Whatever
holds the Active Org therefore has to be readable from inside Postgres, on every statement,
with no application in the path.

A cookie is not. Reaching one from a policy means plumbing it through as a request header
and reading it back out of `current_setting('request.headers')` — which is to say, taking
a value the browser sent and handing it to the one function org isolation rests on. That
can be made safe, by checking the value against a Membership before believing it, and the
check is the part that does the work. Once it is there the cookie is only a *selector*, and
a selector may as well live somewhere the database already trusts.

The cost of getting it wrong is not a broken screen. It is a signed-in member of one
organisation reading another organisation's prices.

## Why not a JWT claim

A claim is the strong version of the same idea and it genuinely works: a custom access
token hook stamps the org into the token, the token is signed, and every policy reads
`auth.jwt()` with no table lookup at all. That last part is a real gain — it removes a
subquery from every policy on every statement.

It is refused for three reasons, none of them about correctness.

**It adds infrastructure to the thing that must not break.** An access token hook is
configuration living outside the migrations, in the Supabase project that preview and
production share. The schema's own history is a sequence of tickets discovering that
something load-bearing was inherited rather than written down — table privileges most
recently (20260825010000), which had been an accident of Supabase's bootstrap for as long
as the app had existed. Putting org isolation into project configuration is that mistake
made deliberately.

**Switching becomes a token refresh.** The claim is minted at sign-in, so changing the
Active Org means forcing a refresh and living with a window in which the session's token
still names the old org. A write to a column takes effect on the next statement.

**The performance argument is not yet owed.** Fewer than ten people use this app. Trading
a subquery for a deployment dependency buys speed nobody has asked for at a price the one
security-critical function has to pay.

If a seat count ever makes the lookup hurt, the claim is the answer and this ADR is where
to start; the shape below does not have to change for it, because a claim would still be
checked against a Membership.

## Why the person, and not the session

Held on `users`, the Active Org is per-person: it is the same in every tab and on every
device, and changing it in one changes it in all.

That is the glossary's own framing rather than a concession to the simpler
implementation. **Active Org** calls the switcher a *global mode* and says the control
exists so that a person holding several Memberships "changes it deliberately rather than
seeing two organisations' Tenders in one list". Two tabs showing two organisations is the
situation the term was written to prevent, and a per-session Active Org is how you build
it.

A global mode also fails visibly. Somebody who forgot they switched sees one organisation
everywhere and can say so; somebody whose tabs disagree sees a Tender list that is right
in one window and wrong in the next, with nothing on either screen to say why.

## The column is a selector, never an authority

This is the load-bearing half, and it is what makes a plain nullable column safe:

```sql
with live as (
  select m.org_id from memberships m join users u on u.id = m.user_id
  where m.user_id = auth.uid() and m.disabled_at is null and u.disabled_at is null
)
select coalesce(
  (select org_id from live where org_id = (select active_org_id from users where id = auth.uid())),
  (select org_id from live where (select count(*) from live) = 1)
)
```

The Active Org can only ever pick **out of Memberships actually held**. A value naming an
organisation the caller has no live Membership in produces no row and therefore no access
— it cannot grant anything, however it got there.

The second clause is the answer for everybody who has never chosen, which today is
everybody: **when exactly one Membership is live, it is not a choice, it is the only
organisation there is.** It is safe for the same reason as the first — it can only return
an org already in `live` — and it means an unset column locks nobody out, which matters
because the switcher deliberately does not render for people holding one Membership
(ADR-0038). There is no `limit 1` anywhere in it: with two live Memberships and an Active
Org resolving to neither, this is null and the caller reads nothing until they choose.
Fail closed, never arbitrary.

## What follows from it

- **`users.active_org_id` is nullable, and null is not a fault.** Every row the backfill
  touched has a value and every row the app writes gets one, but the function is correct
  without it, so nothing has to defend the column's contents.
- **It is not writable by `authenticated`.** `users` was revoked down to `update (name,
  locale, theme)` by 20260814010000 and 20260904000000, and the Active Org does not join
  that list: switching goes through a server action that checks the Membership and writes
  with the service role, exactly as Disabling and inviting already do.
- **A stale Active Org is self-correcting for one Membership and fail-closed for several.**
  Disabling somebody's Membership does not require clearing their Active Org — the join
  stops producing the row, which is the whole mechanism.
- **The `users` policy moved with it.** `org_id = current_org_id()` became
  `shares_current_org(id)`, because on `users` alone that column meant "belongs to that
  org", which is now the Membership's sentence. Every other table keeps `org_id =
  current_org_id()` unchanged — only the right-hand side's source moved.
- **Reading a colleague does not depend on their Membership being live.** Disabled
  colleagues are exactly who the People screen is opened to look at, and a Quote records
  who sourced it. Whether somebody may *act* is `current_org_id()`'s answer about
  themselves; whether you may *see* them is a separate question with a separate function.

## What this deliberately does not solve

Two devices cannot look at two organisations at once. That is the intended behaviour
rather than a limitation, and if it ever becomes a real complaint the fix is a
per-session override layered over this column — not a different home for it.

Nothing yet creates a second Membership, so none of the switching machinery has a user.
That is ADR-0038's subject.
