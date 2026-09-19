# A Tender is priced in the currency it opened in

Ticket 176 ([#176](https://github.com/Mikepeerawit-com/awardley/issues/176)) moves the
**Reporting Currency** out of the schema and onto the organisation, in the posture the
**FX Buffer** already has: an Org Admin's setting rather than a deploy. That reopens a
question the glossary never had to answer, because until now the answer was a constant —
**what happens to money already recorded when the setting changes.**

The Reporting Currency is held on the organisation and **stamped onto each Tender when it
is opened**. Changing the setting changes what the next Tender opens in. It changes
nothing about a Tender that already exists.

## Why the Tender, and not the organisation

An organisation-wide value that can change is not a setting, it is a rewrite of every
figure the app has ever shown.

`unit_price_reporting` is a stored generated column over a **Frozen Rate** — the rate is
frozen, so the number does not move. Only its *unit* would. An org switching THB to SGD
would leave every historical total sitting at the digits it always had, relabelled into a
currency those digits were never computed in. The **Frozen Rate** exists so that "no total
may move because a currency did"; a total that stays put while its label moves breaks the
same guarantee, and breaks it more quietly, because there is no changed digit for anybody
to notice.

The alternative — walking existing rows to re-derive them — is refused by ADR-0018 in as
many words: *nothing recomputes historically*. A Quote nobody edited is bit-for-bit what
it was.

## Why the Tender, and not the Quote

Freezing the target currency onto each Quote, alongside the rate it already freezes, is
the obvious symmetry and it is wrong.

Ranking happens **inside** a Tender Item: the Working Sheet puts every competing Quote for
one Item in one column and sorts it. Two Quotes frozen against different Reporting
Currencies in that column are two different units drawn as one list, and the sheet has
only bad options — refuse to rank the Item, or re-convert and break the Frozen Rate.

The comparison is the thing the Reporting Currency exists to serve, so the currency
belongs to the unit the comparison happens in. Stamped at the Tender, every figure under
it shares one currency by construction and no sheet ever has to ask.

It also covers the money that is never converted at all. `landed_cost_per_unit` and
`selling_price_per_unit` are hand-entered numbers whose currency exists today only as a
`-- THB` comment. They are denominated in the Tender's currency for the same reason and by
the same mechanism, rather than needing a second one.

## This is the FX Buffer's sentence, one noun changed

The glossary already says of the FX Buffer: **changing it changes what the next Quote
freezes** — nothing walks existing Quotes to re-price them, and a change that did would be
a bug rather than a feature.

Changing the Reporting Currency changes what the next Tender opens in. Nothing walks
existing Tenders, and a change that did would be the same bug.

## What follows from it

- **`tenders.reporting_currency` is written once, at creation, from
  `orgs.reporting_currency`, and never updated.** It is immutable in the way a Frozen Rate
  is immutable, and for the same reason.
- **A Quote gets no `reporting_currency` column.** It is the Tender's, reachable by join.
  A stored copy is a second number to keep in step with one that already exists — the
  argument this schema already makes for not storing margin.
- **The Reporting Currency must be a convertible currency** at the moment a Tender opens.
  The picker offers the ECB reference list, the same list a Quote may be entered in: an
  organisation reporting in a currency ECB does not publish could not convert a single
  foreign Quote into it. This ticket leaves a provider seam and does not add a provider.
- **Money is never summed across Reporting Currencies.** Where a figure spans Tenders —
  the dashboard, any cross-Tender total — it is broken out per currency rather than added
  up. This is not a new rule: the app already refuses to rank a Quote whose `quoted_unit`
  does not match its Item's, because adding unlike units produces a number that looks like
  an answer. A sum across currencies is the same mistake one level up.
- **A list spanning two currencies labels each row**, rather than picking one and hoping.
- **Nothing is refused because an organisation changed its mind.** Old Tenders stay
  readable, rankable and reportable in the currency they opened in. The change is additive
  and takes effect the next time somebody opens a Tender.

## What this deliberately does not solve

An organisation that changes its Reporting Currency has a mixed estate, and no screen
totals across it. That is the honest rendering of what happened rather than a gap: the
figures genuinely are in two currencies, and the only way to produce one number would be
to convert at a rate nobody froze.

The expectation is that this is a tail case — an organisation picks its currency once, at
signup, and never returns to the setting. The design makes the tail truthful; it does not
optimise for it.
