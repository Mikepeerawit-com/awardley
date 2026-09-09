# The edit screen is a list of Items you open one at a time

_Written by [#152](https://github.com/Mikepeerawit-com/tender-tracker/issues/152), the
question [ADR-0027](0027-the-edit-screen-is-not-a-transcript-of-the-table.md) declined to
take._

**Status:** accepted. Reverses the non-decision ADR-0027 recorded under _"What was
considered and not done"_; that paragraph now points here. Nothing is superseded —
[ADR-0026](0026-the-tender-detail-has-parts.md)'s rule about what goes behind a fold is
applied rather than amended, and ADR-0027 holds in full otherwise.

ADR-0027 shortened the edit screen by 19% and stopped one change short of the largest one
available. It said why: folding the Item forms _"changes what the screen **is**, from
'everything about this Tender, editable' into 'a list you open one at a time', and that is
a decision to make deliberately rather than as the tail of a density pass."_ This is that
decision, made deliberately, and it is **yes**.

## The measurements

At 390px, off `@/test/screens`' edit records, in both locales. `npm run screen-length`
prints the **After** column on this tree and printed the **Before** column on the commit
this branch left from; every unbracketed figure below is a row of that output, and every
figure arrived at by subtracting two of them says so where it appears.

| Edit surface, whole page | `en` | `zh-Hans` |
|---|---|---|
| Before | 2,915px (3.5×) | 2,879px (3.4×) |
| **After** | **2,111px (2.5×)** | **2,075px (2.5×)** |

**804px in both locales — 28% of the screen, and a whole screenful of scrolling.** The
figure is identical in `en` and `zh-Hans` because what was removed is Latin either way: a
product name is what the client wrote, and nothing translates it.

All of it comes off one block, which is the block this decision is about:

| Block | `en` before | `en` after | `zh-Hans` before | `zh-Hans` after |
|---|---|---|---|---|
| The screen header | 104px | 104px | 104px | 104px |
| The Tender's own fields | 858px | 858px (41%) | 842px | 842px (41%) |
| **Tender items** | **1,134px (39%)** | **330px (16%)** | **1,114px (39%)** | **310px (15%)** |
| Reference images | 447px | 447px (21%) | 447px | 447px (22%) |
| Assignees | 244px | 244px (12%) | 244px | 244px (12%) |

**The bars are taller than the projection assumed.** 804px over three Items is 268px an
Item — subtraction on the two rows above, and the only figure here the tool does not print
directly. Triage projected 278px an Item, a 322px form becoming a 44px bar. The missing
10px is the fixture's product names **wrapping the summary to a second line**, which is
the honest case rather than a bad fixture:
`NitrileExaminationGlovesPowderFreeSizeMediumNonSterile` is the sort of thing a client
writes and a 390px bar does not hold it. The 44px in the projection is `Fold`'s floor, not
a height — what it guarantees is that a one-line bar still clears the tap target, and a
two-line one is simply two lines.

**Opened, an Item costs more than it did.** The record that opens all three comes to
3,080px in `en` and 3,044px in `zh-Hans` — 165px _taller_ than the screen was before,
which is the three bars still drawn above the three forms. Opening one Item costs 323px —
again subtraction, the *Tender items* block across those two records over three Items —
so the reader who came to
correct one thing scrolls 2,434px where they used to scroll 2,915px, and the reader who
opens all three scrolls 165px further than before. That is the trade in one line, and
which of those two passes is the common one is the whole of the reasoning below.

## The act on this surface is correcting one thing you already know is wrong

A Tender arrives complete. It is recorded on `/tenders/new`, in one pass, from an email —
that screen exists to take a whole Tender and this one does not. The edit surface is
reached by a button on a screen somebody opened to **read**, and the crossing from reading
to editing happens at the moment they spot one specific thing wrong: a quantity that says
400 where the email said 40,000, a unit typed as _piece_ that should be _box of 50_.

Going down all three Items filling them in is the rare pass, and it mostly does not happen
here at all. So the screen that serves the common act is the one where the Item you came
for is one tap away and the two you did not come for are out of the way — not the one
where all three are open and the one you want is 600px down.

**The fold adds information rather than hiding it.** Three identical unlabelled bordered
boxes is a worse list than three bars reading _Nitrile examination gloves_, _Surgical face
mask_, _Disposable syringe_. Before this change the screen never said which Item was
which except by the contents of a field inside it. Now it says so three times, at the top.

## It is not the Owner's screen, and that was load-bearing

ADR-0027 called this "the Owner's other long screen" and the fixture calls the reader an
Owner, and neither is a rule. The Edit control is drawn for every reader; this page's only
branch is on the shape of the Tender rather than on who is looking; and the domain layer
states it outright — see **Owner** in [`CONTEXT.md`](../../CONTEXT.md), which gained the
clause during this issue's triage: _under ten trusted users there is no editing gate
beyond org membership._

That matters here because the argument against folding was an Owner's first pass over a
Tender, and the reader this screen actually gets is at least as often an **Assignee who
spotted a typo mid-sourcing** — which is the one-Item correction case almost by
definition. The screen was being designed for the rarer of its two readers on the strength
of a description nobody had checked.

## "Everything about this Tender, editable" is retired

That sentence was ADR-0027's whole reason for not acting, and it was a **description of
how the screen had been built that had been promoted to a principle**. It was also
already false when it was written: ADR-0027 itself put the add-an-Item form behind a fold
in the same commit, so the screen has never since been everything-at-once.

What replaces it: **the edit surface is a list of the Tender's Items, each opened to
correct it, with the Tender's own fields above them.** Nothing is removed from the screen
and no field is hidden from anybody who wants it — one tap is the price, and it is the
same tap the reader would have made scrolling to the Item anyway.

## Only the Items fold, and the Tender's own fields do not

The Tender's own fields block is 858px, comparable to what the three Items cost, and it
stays open. This is not an oversight and it is the question the next reader will arrive
with, so:

**A list of _n_ named things folds well; one fixed record does not.** Each Item has a
summary that adds information — its product name, which is not otherwise on the screen.
The Tender's fields have no such summary available: the only thing a bar over them could
say is _Tender_, which restates the heading already above it. Folding them would trade
858px of a screen for a bar that tells the reader nothing and one more tap on the way to
the client name and the three deadlines, which is the block a reader who came to correct
a **date** came for.

The rule is ADR-0026's, applied rather than extended: a block goes behind a fold when the
reader did not arrive with the question it answers. _Which Item?_ is a question with three
answers and the reader has one of them in mind. _What are this Tender's dates?_ is not.

## What the summary says

**The product name, alone.**

**Not a completeness mark.** The domain's Item validation gates the update path exactly as
it gates the add path — `itemProblem` refuses a blank product name and a non-positive
quantity on both — so a saved Item always has a name, a unit and a positive quantity, and
there is no such thing as a half-filled Item that could hide behind a tidy bar. #152's own
"if it is taken" bullet asked for such a mark; it is void, and it is worth saying why
rather than leaving it looking forgotten.

**Not the quantity.** `Fold`'s count slot means _how many things are in there_ — three
Assignees, two unplaced pictures — so `40000` in it would read as the number of things
behind the fold rather than as the number of gloves.

**The bare product name is already how this screen labels an Item**: the Reference Image
gallery below groups the client's pictures under it. Two labellings of the same thing on
one screen would be worse than one.

## What derives openness, and nothing stores it

Openness is a prop computed on every render, the posture `Fold` and `ItemDisclosure`
already take and the one the add-an-Item form already takes on this screen. Two things
derive it:

- **A submit this Item's server refused** — a save or a remove. The Item comes back open
  with what was typed still in it, and nothing else opens: the refusal is about one Item.
- **A Tender with exactly one Item** draws that Item open, derived from the Item count in
  the page exactly as `removable` already is. A fold over a list of one is a bar with
  nothing to choose between, and it puts a tap in front of the only editable thing on the
  screen.

**A fold the reader opened by hand survives a save that succeeds.** That is not extra
code; it is what React's writing `open` only when its own value for it changes gets you
for free, and it is the same mechanism ADR-0027 recorded for the add-an-Item fold. It is
also the reason a refused *remove* opens the Item: the sentence explaining that the last
Item on a Tender cannot go is drawn inside the panel, and a bar that stayed shut would
swallow it.

**Nothing is persisted anywhere.** No effect syncs openness to a server, no preference is
stored, nothing is read back on the next visit. A screen that reopened whatever somebody
poked at last week would be showing them their own history instead of the Tender.

## Consequences for the guards

**A shut `<details>` fails `checkVisibility()`**, so every guard in the `layout` project
stops at a summary bar — the contrast walk, the focus and motion walks, the 390px measure
and the 44px tap floor. Before this change the three Item forms were walked on both
existing edit records; behind a fold they would be walked on neither, and twelve inputs,
three Saves and three Removes would go quietly unchecked.

**`"editing a tender, with every item open"` is a third record in `@/test/screens`.** All
three Items, not one: the forms are interchangeable only until somebody makes them not,
and a record that opened one would pass in silence while two went unwalked.

**The edit factory takes an options object.** Three records now come off one body, and
they differ by a prop each. `editingATender(false, true)` says nothing at a call site
about which fold is which; `editingATender({ openingItems: true })` does.

**The forms' own derivation has a suite.** `tender-item-forms.test.tsx` holds what only
exists once the component is interactive: shut on arrival with more than one Item, open as
the only Item, open on a refusal with the typing still in it and nothing else open, and a
hand-opened fold left alone across a save that succeeds. It reads openness off the
`<details>` property rather than off what is visible — jsdom has no layout and draws a
shut disclosure's contents as plainly as an open one — and it asks the DOM for the
disclosure again after each submit rather than holding the element from before it, since
a fold remounted across a save is a different element and the one captured earlier would
still be reporting the openness it was detached with.

**The last of those was confirmed by producing the failure**, which ADR-0016 says is the
only review a check really gets: remounting the fold across a submit turns it red, and
the same break leaves the four assertions about the *drawn* screen green. It also caught
a real one on the way in — a `mockClear` that keeps the mock's implementation had the
refusal from the previous test still installed, so the successful-save assertion was
passing down the refusal path.

**No density budget is written for this screen, and that is unchanged.**
`density.layout.test.tsx` says in its own header why: #98 reduced two screens and this was
not one of them, so a number written now would be a number nobody set. This work reduced
the screen, which would be the moment — except the number would still be measured off the
screen rather than chosen, which is the thing that file calls not a check. The screen
carries every shared guard, as it did before and now on three records rather than two.

## What is still not done

- **A jump bar.** ADR-0027 declined it because this screen's labels wrap to two rows of
  sticky chrome at 390px. Folding the Items does not change those labels, so it stands.
- **Deep links to a single Item.** Nothing links into this screen with a fragment, and a
  jump to a shut fold leaves it shut — `Fold` records why that is the browser's behaviour
  and left alone. Opening one from a fragment would need a script, which is what that
  component is server-rendered to avoid.
- **The count of Quotes or anything else on the bar.** The Item's own facts are one tap
  away and the bar is for choosing between Items, not for reading them.

## The risk, named

The pass this makes worse is the one that goes down every Item: three taps instead of
none, and 165px more screen when all three are open. That pass exists — an Owner
reconciling a revised email against a Tender already recorded — and it is not the pass the
screen is measured for. If it turns out to be common, the answer is a control that opens
all of them at once rather than a return to three open forms, and it will be a decision
with the same measurements available to it as this one.
