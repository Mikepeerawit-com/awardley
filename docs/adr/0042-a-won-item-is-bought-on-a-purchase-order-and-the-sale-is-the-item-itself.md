# A won Item is bought on a Purchase Order, and the sale is the Item itself

Decided 21 October 2026. Awardley grows from a tender tracker into the operating system
of a trading company — the chain that runs from a client's enquiry through buying the
goods, delivering them and being paid. It stays one SaaS product; Taihue pilots each
module before anybody else sees it. This ADR fixes the *shape* of that growth and the
first module in it. The ticket that builds the module carries its own ADR for the
mechanism, as ADR-0040 and ADR-0041 did for the Plan.

## The chain, and where it stops

A trading company that holds no stock does one sequence over and over: a client asks,
suppliers quote, we bid, we win, **we buy from the supplier whose Quote we bid**, the
goods go to the client, we invoice, we are paid. Everything up to "we win" is built.
What Taihue does by hand the morning after a win is the next link, and it is the one
this ADR opens: purchasing.

Three things are deliberately not on the road.

**No Sales Order.** A won Tender Item already says who the client is, what they bought,
how many, in what unit, and at what selling price — in the currency the Tender opened
in (ADR-0036). A Sales Order row would repeat every one of those and introduce the
question of which copy is true. ADR-0001's instinct holds: the sale is derived from the
Item's `won` Outcome, never stored a second time. Whatever downstream needs "the order"
reads the won Item.

**No stock.** Taihue buys to order, and so does the customer this product is for. A
goods-received figure, when the fulfilment module adds it, is a quantity on a Purchase
Line, not a balance in a warehouse. An inventory module is an insert into this list the
day a customer who holds stock asks for one, and not before.

**No ledger.** Invoices, VAT, withholding tax, e-Tax and the books are a regulated
domain with established Thai products in it. When invoicing arrives it hands the figures
to the accounting tool the organisation already uses — FlowAccount, PEAK, Xero — and
owns only the operational fact that an invoice went out and whether it was paid.

The sequence after this ADR, each its own ticket and ADR: **purchasing** (this), then
**fulfilment** — received against the Purchase Order, delivered to the client, partials
— then **invoicing** through the accounting tool. Plan gating comes with each module the
way `money_layer` came with the Plan: a column on `plans`, read where the act happens,
refusing the next act and destroying nothing (ADR-0040).

## Decision

**A Purchase Order is one order to one supplier, under one Tender.** It is raised from a
Tender that has won Items, and it lists the won Items whose Selected Quote is that
supplier's. Taihue competes (ADR-0033), so a four-Item Tender routinely wins on three
suppliers and raises three Purchase Orders; one Item is bought from one supplier unless
the Owner splits it on purpose. A Purchase Order does not span Tenders. Consolidating a
supplier's lines across Tenders is a real thing trading companies do and is the first
thing this decision leaves open — it is left open because a Purchase Order that belongs
to one Tender is read from the Tender, costed against the Tender, and later delivered
and invoiced under the Tender, and a cross-Tender order breaks all three at once for a
convenience nobody has yet asked for.

**A Purchase Line is one Tender Item on one Purchase Order, pre-filled from the Selected
Quote and then edited.** Quantity starts at the Item's quantity; unit price and currency
start at the Quote's. Both are editable, because the client sometimes awards fewer than
they asked for, and the supplier sometimes moves on price once the order is real. The
line keeps a pointer to the Quote it came from, so that what was quoted and what was
ordered can always be read side by side. **Editing a line never writes back to the
Quote or to Landed Cost.** The Quote is what the supplier said at the time; the Landed
Cost is what the Bid was built on; the Purchase Line is what we actually bought at.
Three figures, three facts, and the same posture as the Frozen Rate (ADR-0018): a
correction downstream does not rewrite the record upstream.

**A Purchase Order is priced in the supplier's currency and derived into the Reporting
Currency at the Quote's Frozen Rate.** No new rate is fetched. The applied rate the
Quote froze is the rate the Bid was costed on, and a Purchase Order whose total moved
because a currency did would put the Tender's cost at odds with the Working Sheet that
decided it. Money is never summed across two Purchase Orders in different currencies.

**Its states are facts, not a status column.** `sent_at`, `confirmed_at` and
`cancelled_at`, read into Draft, Sent, Confirmed and Cancelled, exactly as `submitted_at`
is read into Progress. Sent is the human's record that the order went to the supplier,
whichever channel carried it — WeCom, email, LINE, a phone call. The app does not send
it in this module; it renders a document the supplier can be given, and the person who
gave it says so. Confirmed is the supplier's acknowledgement, and carries the date they
promised. A Draft may be deleted; a Sent order may only be Cancelled, because a supplier
has seen it. Cancelling frees the Item's quantity, and nothing else is undone.

**Not Yet Ordered is the derived state the module is finishable against.** A won Tender
Item whose ordered quantity — summed over its Purchase Lines on orders not Cancelled —
is short of its quantity. Never stored. It is the purchasing counterpart of Not Yet
Sourced: the list of what still needs doing, which empties by doing it, and which is the
reason the module exists. An Item whose Outcome is cleared from `won` leaves the list;
one bought on a Cancelled order comes back.

**The Owner raises it, and the Assignee whose Quote it is built from may read it.** A
Purchase Order is all money, and ADR-0020 draws Assignees out of money — but every figure
on a Purchase Order to supplier X is a figure the Assignee who quoted supplier X typed
in themselves, and they are the one who will chase supplier X. Selling prices and Margin
are not on it. So the document is drawn for the Owner and for that Assignee, and either
may mark it Sent or Confirmed. The money the Assignee must not see is the client's
side, and a Purchase Order has no client side.

**A Supplier becomes a thing with a screen.** Today a supplier is a name and a country,
created in passing when a Quote is entered. A document addressed to one needs a contact
person, a way to reach them, and an address — and a trading company's supplier list is
one of its assets, not a side effect of its Quotes. The supplier record gains those
fields and a list of its own; nothing about Quotes changes.

**Purchasing is gated by the Plan.** A `purchasing` column on `plans`, read where a
Purchase Order is raised. The free tier does not have it; raising is the act that is
refused, and a lapsed organisation keeps every order readable.

## What this is not

- Not procurement in the enterprise sense: no approval chains, no requisitions, no
  three-way match. Under ten trusted users the Owner raising it is the approval.
- Not a supplier portal. The supplier gets a document; they do not log in.
- Not a price list. What a supplier charges is what they quoted this time, on this
  Quote; the module does not learn a catalogue from it.

## What must not be quietly undone

- **No Sales Order table.** Anything that wants "the order the client placed" reads the
  won Item. Adding the table to make one query simpler puts the sale in two places.
- **A Purchase Line never writes to the Quote or the Landed Cost.** The three figures
  are three facts.
- **No new FX fetch for a Purchase Order.** The Quote's frozen applied rate is the
  rate.
- **Not Yet Ordered is derived.** A stored "ordered" flag on the Item drifts the first
  time an order is cancelled.
- **A Sent order is cancelled, never deleted.** The supplier saw it.
- **The Assignee sees the Purchase Order only when the Selected Quote is theirs.** The
  seam is the Quote, not the Tender: an Assignee who quoted supplier X for Item 1 does
  not see the order to supplier Y for Item 2.
