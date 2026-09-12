# The Owner rules a Quote out, and the sheet shortens because they did

_Written by [#158](https://github.com/Mikepeerawit-com/tender-tracker/issues/158), the
question [ADR-0030](0030-the-sheet-is-long-because-the-owner-reads-every-quote.md) named as
the one actually open._

**Status:** accepted. Amends
[ADR-0009](0009-comparison-sheet-reflows-at-768px.md), whose closing line reads _"Nothing in
the schema moves. This is a rendering decision end to end"_ — this moves it, and that line
now points here. Nothing is superseded: ADR-0009's breakpoint, its one-responsive-design
rule and its rejection of phone-only interactions all hold in full, and ADR-0030's finding
that the sheet's length is correct is the premise this is built on rather than something
it revisits.

ADR-0030 closed the length question and left one open in its place: the Owner cannot hold
two offers side by side on a phone, and _"scrolling does not solve that. Memory has to."_
This is the answer, and it is not a layout. **The Owner marks a Quote unsuitable, and the
sheet gets shorter because they did.**

## What the act actually is

#158 was framed as co-visibility — rank 1 and rank 5 never on screen together — and that
framing is wrong, or at least it is not the thing worth building for.

**The Owner is not comparing two offers. They are eliminating offers one at a time.**
ADR-0030 established that the Owner reads *every* Quote and judges fit before price: does
this meet the specification, is the Alternative near enough, do the photographs show the
thing the client described. That is a sweep down a list, not a duel between two cards.
Nobody holds five specifications in mind and then picks; they read one, discard it, and
stop carrying it. What the Owner needs is not two cards adjacent — it is for the field to
get smaller as they work.

This matters because the two readings buy different things. A comparison surface — pick
two Quotes, see them together — is the design ADR-0009 turned down three times, and each
rejection was for the same reason: it _"buys back co-visibility by introducing a phone-only
interaction the desktop screen does not have."_ Overturning that needed an argument nobody
had. **Ruling out does not need one, because it is a data act rather than a layout.** The
control renders identically at 390px and at 1280px; there is no phone-only interaction to
justify. ADR-0009 survives untouched on the axis it cared about, and is amended only on
the axis it did not anticipate.

## What it is, in the data

**Ruled Out is a state on the Quote.** Columns on `quotes` recording who ruled it out,
when, and an optional note.

It cannot reuse the mechanism `Selected` uses, and the reason is worth stating because it
looks at first like the obvious move. `Selected` lives on `tender_items.selected_quote_id`,
chosen in the v1 schema over a `quotes.is_selected` boolean specifically to make _"one
Selected Quote per Item"_ structural rather than a rule the app has to remember. Ruled Out
is many-per-Item by nature — the Owner may discard four of five — so the pointer shape is
unavailable to it, and it takes the boolean shape that `Selected` deliberately rejected.
The two terms face each other in the vocabulary and are built differently on purpose.

**The note is optional and must never block the discard.** The judgement is made several
times per Item on a screen the Owner is already scrolling; a required reason turns a tap
into a form, and the friction lands precisely on the behaviour that shortens the sheet. An
Owner who writes "wrong voltage" saves themselves re-reading the same Quote next week,
which is worth offering and not worth insisting on.

**Attribution is recorded even though only one person can see this screen.** ADR-0020 means
an Assignee cannot open the working sheet at all, and `CONTEXT.md`'s **Owner** entry names
comparing as one of the two things ownership confers, so the Owner is the only user who can
reach the control. The columns are recorded anyway because the same glossary entry says
ownership is _accountability, not exclusive write access_, and because `created_by_user_id`
on the same table is the precedent: this app writes down who did things.

## What happens on the sheet

**A ruled-out Quote collapses to a one-line stub** carrying the supplier name, and reopens
on one tap. A card costs 232–350px (ADR-0030); a stub costs a line. That difference,
across the four Quotes an Owner discards on a five-Quote Item, is the whole point.

The pattern is not new. `ItemDisclosure` already folds a decided Item to a summary line and
leaves it in the list, with openness derived from `selected_quote_id`. **A stub is that same
move one level down**, at Quote granularity instead of Item granularity, which is why it
needs no new interaction vocabulary and why undo is free — the stub is the affordance.

Greying the card out was considered and is not an answer: a desaturated 300px card is still
300px, and the sheet does not shorten. Removing ruled-out Quotes from view entirely was
considered and is worse than the stub, because it needs a "show ruled out" control that
exists nowhere else in the app, and because ADR-0030's whole finding is that the Owner
reads every Quote — one they can no longer see without a mode change is one they cannot
re-check.

**The control sits in the card's identity half**, above the hairline with the supplier, the
sourced-by line and what was actually offered. ADR-0030 measured the card in exactly these
two halves and named the identity half as where the fit judgement is made, so the control
goes against the evidence it is made from. Not the corner: ADR-0028 gives a corner to
saying what kind of thing something is, and a control there reads as a kind marker. Not
beside `Select` at the foot: that would make ruling out look co-equal with selecting, and
it is not — `Select` is the terminal decision and this is a sorting move on the way to it.

## Ruled-out Quotes leave the ranking

**A ruled-out Quote is not passed to `rankQuotes`.** Ranks renumber, `isLowest` moves, and
all four Item banners recompute over the Quotes that are left.

`ranking.ts` is arithmetic over an array, so this costs nothing structurally — it is
decided entirely by which array the caller passes. What it buys is that the sheet stops
making claims the Owner has already overruled. `too_close_to_call` naming a leader the
Owner discarded, or `duplicate_supplier` firing about a duplicate that is no longer in
play, is the _"quietly wrong"_ failure that module exists to prevent.

The case that settles it is `isRankable`, which refuses **Item-wide** on a unit mismatch:
one Quote priced per box among seven per piece and the whole Item loses its rank numbers,
its `lowest` chip and its ordering. **Ruling out the mismatched Quote restores ranking to
the Item**, which is correct and is also the clearest demonstration that a ranking is a
statement about the field under consideration rather than about every row ever entered.

**The consequence to accept out loud: the identity of rank 1 can change as a result of the
Owner's own act.** That is legitimate — a human judged, the app did not — but it must not
read as the sheet reshuffling itself, and whoever builds it should watch that moment.

## Nothing is hidden by price, and this does not weaken that

ADR-0030 makes it a hard constraint that nothing may be hidden by price, and this decision
pins what that forbids: **the app must not remove a Quote from view on a price basis.**
Ranking is not hiding — a ranked Quote is still drawn, still readable, still one tap from
its photographs — so cheapest-first ordering and ADR-0029's promotion of the converted
figure to display size are untouched.

A human ruling out the cheapest Quote because its product is wrong is not a violation of
this. It is the constraint working: the judgement was made on fit, by the person
accountable for the client, and the app's role was to record it.

## The rules that fall out

**Ruling out the Selected Quote is allowed, and clears the selection.** It confirms twice,
exactly as deleting a Selected Quote already does — `quote-row-controls.tsx` records that
this _"costs a decision"_, and the `clears_selection` error path already exists for the
race where somebody selected it between render and press. Holding both states at once was
rejected as incoherent rather than as difficult: `Selected` is _"the Quote we chose to build
our Bid from"_ and Ruled Out means unsuitable, and a Quote carrying both is a sentence the
sheet cannot render. The mirror case does not arise — a stub has no `Select` button, so an
Owner reopens the Quote and then selects it.

**A correction clears the mark when it changes the offer's identity, and not otherwise.**
`supplierName`, `matchType`, `alternativeProductName` and `quotedUnit` clear it;
`unitPrice`, `quotedAt`, `leadTimeDays` and `detailNotes` leave it standing.

This matters more than it looks, because `mayCorrectQuote` allows **the Assignee who
sourced a Quote** to correct it, and this ADR keeps the Owner's judgement invisible to that
Assignee. So the offer can change under a standing judgement, silently, from a person who
does not know a judgement was made. The rule is already established one line away in the
same function: `quotes.ts` clears `alternative_product_name` when a correction returns a
Quote to an exact match, because _"left behind, it is a substitute's name on a row that no
longer offers one."_ A ruled-out mark on a Quote whose product has since changed is the
same species of stale claim and gets the same treatment. Clearing on *every* correction was
rejected for the opposite failure: an Assignee fixing a typo'd price would silently
resurrect a Quote the Owner discarded on specification, and re-lengthen the sheet for a
reason that has nothing to do with why it was shortened.

**Every Quote on an Item may be ruled out, and that gets a banner.** Five offers arrived and
the Owner judged none of them fit. Forbidding it was rejected because it would force the
Owner to leave standing a Quote they have judged unsuitable, which puts a lie in the data.
The banner is computed from the Quotes rather than stored as a state, which keeps this
decision's schema change to one set of columns on one table.

**It is emphatically not `No Supplier Found`.** That term is the *Assignee's* first-person
record that they could not source an Item, and it exists to separate _"nobody could supply
this"_ from _"nobody tried."_ All-ruled-out is a third thing neither covers: somebody
sourced, offers arrived, and the Owner judged none of them suitable. Reading the two as the
same condition would lose the distinction the first one was created to make.

**The Item does not fold when everything on it is ruled out.** `derivedOpen` means *the work
here is done*, and this is the opposite — it is the one Item that now needs somebody to go
back to the Assignee and ask for more. Folding it would also hide the banner above, inside
the panel that just shut.

## The vocabulary

**Ruled Out Quote** — a Quote the Owner has judged unsuitable, pairing with **Selected
Quote** and filling the gap `CONTEXT.md` had: a word for the Quote we chose, and none for
one we rejected. `已排除报价` against the existing `已选定报价`.

The label takes `Select`'s register rather than `No Supplier Found`'s, and the distinction
is worth recording because the conceptual cousin is the wrong model. `No Supplier Found` is
written in the first person — _"I could not source this"_, _"I found one after all"_ —
because it is an admission other people read: `"{name} could not source this."` `Select` is
a plain imperative because the Owner is alone on that screen. A ruled-out mark is never read
by anybody but the Owner, so it is imperative: `排除` against `选定`.

Avoided: **rejected**, **declined** and **passed**, all of which imply the supplier was
told and nobody is; **discounted**, which collides fatally with money on a screen made of
prices; and **unsuitable**, which is a status where this glossary's convention is the act.

## What it costs

**ADR-0009's cleanest claim stops being true.** _"Nothing in the schema moves"_ was a real
property of the comparison sheet — every question about it could be answered by reading
components — and after this it cannot. A reader of that ADR now has to know about a table.
The amendment says so at the point of the claim rather than leaving it to be discovered.

**The Owner can shorten the sheet into a state that misleads them later.** Four stubs and
one live Quote looks like an Item with one offer, and the judgement that made it so may be
weeks old and may have been made in a hurry. The optional note is the mitigation and it is
optional, so it will often be absent.

**A second per-Quote state exists on a screen that had one.** `Selected` and `Ruled Out`
interact — the confirm on ruling out the Selected Quote is that interaction showing — and a
third such state would need to reason about both. Anyone adding one should have to argue
for it here.

## Consequences

- **The vocabulary lands before the code.** Every rule above is stated in a term
  `CONTEXT.md` does not yet contain, so the glossary entry and this ADR are one change and
  the implementation follows it.
- **`rankQuotes`'s callers become the place the rule lives.** The module itself does not
  change; what changes is that every caller now has to decide what it passes, and a caller
  that forgets will silently rank discarded offers. This is worth a test at the boundary
  rather than a comment.
- **The correction path gains a rule that is invisible from the correction screen.** An
  Assignee editing their own Quote will clear an Owner's judgement without being told, by
  design. `correctQuote` is where that has to be enforced, beside the
  `alternative_product_name` clearing it mirrors.
- **The Assignee is told nothing, and that is now a bigger silence than ADR-0020's.** See
  below.

## What is not done

**The Assignee who sourced a ruled-out Quote is not told.** ADR-0020 accepted that an
Assignee cannot see they have been undercut, and made **Outcome News** _"genuinely the only
feedback a losing Assignee ever gets."_ This decision holds that line, and it should be
recorded that the argument for breaking it is stronger here than it was there.

A price loss is not actionable — the Tender is over by the time the loser hears. **A
ruled-out-for-fit judgement is correctable while the Tender is still open**: "wrong voltage"
reaching the Assignee before the Internal Quote Deadline can produce a better Quote, and
that is worth real money. ADR-0020 did not have that argument available because the
judgement had nowhere to live; it does now.

It was left out of this decision because it drags a notification surface, a Reminder-shaped
thing and a Trigger Date question in with it, and `CONTEXT.md` already has four Trigger
Dates that were each their own decision.
[#168](https://github.com/Mikepeerawit-com/tender-tracker/issues/168) carried it, and **the
answer came back no**. The Assignee is never told, the note stays optional, and there is no
fifth Milestone.

**The three facts that settled it are all about the surface rather than about the merits.**
The only push this app has is the **Group Robot**, a broadcast into one chat whose
membership nobody here controls — the `notifications` table ships but nothing renders it,
so "their own screen" and "a Reminder" were never two routes to the same place. The
judgement is made *several times per Item* while the Owner scrolls this sheet, and a post
per rule-out is how a group learns to mute the robot it also hears the Reminders through.
And the Internal Quote Deadline is worse than taken: that Reminder reaches only Assignees
who have entered **no Quotes at all**, so it structurally skips the one person this would
have been for.

The correctable-while-open argument is not what lost, which is why it stays written down
above. What lost is that acting on it costs a fifth Milestone and a Trigger Date, and buys
a message into a group chat that the reader would have to be watching at the moment it
scrolled past. **The silence stands, and it now stands on that rather than on deferral.**

**A comparison surface.** Not rejected on the merits so much as not needed: if the field is
eliminated down to two, those two are adjacent, and the problem #158 opened with dissolves.
If it turns out Owners rule nothing out and the sheet stays long, that is the evidence that
would reopen ADR-0009's three rejected designs — and it would arrive as a measurement rather
than as an intuition.
