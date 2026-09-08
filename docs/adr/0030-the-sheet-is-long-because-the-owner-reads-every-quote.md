# The working sheet is long because the Owner reads every Quote, and that is correct

_Written by [#151](https://github.com/Mikepeerawit-com/tender-tracker/issues/151), the
question [ADR-0026](0026-the-tender-detail-has-parts.md) declined to take._

**Status:** accepted. Closes the length question ADR-0026 raised under _"What is still long
is the working sheet itself"_; that section now points here. Nothing is superseded —
[ADR-0009](0009-comparison-sheet-reflows-at-768px.md) holds in full, and its per-card
figure is corrected by a second amendment rather than by this decision.

ADR-0026 measured the Tender detail, found that most of it was the working sheet, and
refused to act: _"If the sheet's length is taken up as a problem, it wants its own
decision and its own measurements."_ This is that decision. It changes nothing about how
the sheet is drawn, and it says why on purpose, so that the length stops being an open
question rather than being re-asked every time somebody scrolls it.

## The measurements

At 390px, off `@/test/screens`' `"a tender"` record, in both locales. Reproduce with
`npm run screen-length`.

| Block of the Owner's Tender detail | `en` | `zh-Hans` |
|---|---|---|
| The Tender's own header | 172px (4%) | 172px (4%) |
| `TenderSections`, the jump bar | 54px (1%) | 54px (1%) |
| The two deadlines | 71px (2%) | 44px (1%) |
| The outstanding band | 227px (5%) | 207px (5%) |
| **Items and quotes** | **3,344px (81%)** | **3,248px (81%)** |
| The two folds, shut | 44px each | 44px each |
| **Whole page** | **4,148px** | **4,005px** |

**81% in both locales**, which is the finding that does not depend on anybody's handset:
a phone screen is a different length on every model, so *how many screenfuls* is a fact
about a device, and *what share of the page is quotes* is a fact about the page.

One ranked Quote below 768px is one stacked card, and a card costs:

| Item | Cards | Card (median) | Card (range) | identity | money |
|---|---|---|---|---|---|
| The gloves | 3 | 326px | 297–350px | 121px | 205px |
| The syringes | 2 | 232px | 232–274px | 101px | 131px |

**Identical in both locales**, to the pixel, which is why one table serves for the two —
a card's height is set by how many lines it draws and not by how wide the glyphs on them
are. The page tables above do differ by locale, and do carry both columns.

`identity` is the half above the card's hairline — supplier, who sourced it, what was
actually offered — and `money` is the half below, and the two are read off the **same**
card as the median beside them so that they add up to it. The range is narrow within an
Item, so an Item's length really is close to `cards × card`; that is what makes the
arithmetic below trustworthy rather than a guess.

**The fixture draws fewer Quotes than a Tender carries.** `"a tender"` opens two
undecided Items holding three and two Quotes. The real number is about **five per Item**
— stated by the Owner during the triage session on
[#151](https://github.com/Mikepeerawit-com/tender-tracker/issues/151), which is the only
source there is: nothing is in production yet, so no query answers this and both fixtures
are inventions. ADR-0009's carries eight, `@/test/screens` carries three, and neither is
the app.

At five apiece the page comes to **≈5,500px** and Items-and-quotes to **≈4,690px, about
85% of it** — arithmetic on the measured card heights, not a measurement, until the
fixture carries five. Raising it is [#157](https://github.com/Mikepeerawit-com/tender-tracker/issues/157), deliberately kept out of this
decision: the record is drawn by roughly a dozen guards and the contact sheet, so what it
holds is not this ticket's to alter in passing.

## The length is a consequence of the act, not of the layout

**The Owner is the client's direct contact, and decides which Quote satisfies what the
client asked for.** That is the act this screen exists for, and it is a judgement about
*fit* before it is a judgement about *price*. Does this supplier's product meet the
specification. Is an Alternative near enough to offer. Do the photographs show the thing
the client described.

That sentence is the whole decision, and it came from the Owner in the triage session on
#151 rather than from the codebase — #151 asked *"what a reader actually does on this
screen"* precisely because nothing here answers it. It is recorded in
[`CONTEXT.md`](../../CONTEXT.md) under **Working Sheet** so that the next decision about
this screen starts from it instead of re-asking.

Price ranks the list. It does not decide it.

Everything that costs height on this screen is what that judgement is made of. The
supplier, the sourcer that ADR-0004 makes the only thing separating two rows from the same
supplier, the Alternative's own product name, the photo count, and the Reporting Currency
figure [ADR-0029](0029-the-sheet-leads-with-the-figure-it-ranks-on.md) put at the head of
the numeral stack. Five Quotes of that is long because five Quotes of that is what the
Owner reads.

## What that rules out, and it is most of what was proposed

#151 listed three ways to shorten the sheet. Two of them die on the sentence above.

**Rank-limited by default — draw the top N, disclose the rest.** It hides by price, and
the Quote that fits might be at any rank. Hiding rank 4 from an Owner whose first question
is *which of these are even the right goods* hides the evidence the decision is made on.
It is the cheapest option and it is the wrong one.

**A two-column comparison, the leader against one challenger.** Same objection — the
leader is defined by price — and a second one ADR-0009 already made: it buys co-visibility
by introducing a phone-only interaction the desktop screen does not have, which is the
ground on which that ADR set aside three alternatives rather than one.

**A denser card.** Not ruled out, and very nearly spent. [#149](https://github.com/Mikepeerawit-com/tender-tracker/issues/149)
took the rank rail and the repeated quantity, ADR-0026 took the doubled quote count and
the empty photo cell, and [#150](https://github.com/Mikepeerawit-com/tender-tracker/issues/150)
spent what slack was left making the ranked figure larger. What remains on the card is a
fact the Owner is reading. There is no fourth thing to remove that is not one.

**So the sheet is not shortened, and this is recorded as the outcome** rather than left as
a symptom somebody meets again. #151 asked for exactly that: _"If nothing changes, that is
a valid outcome and should be recorded as one — the point is that the length stops being
an open question."_

## What is still open is co-visibility, not length

ADR-0009 accepted one cost deliberately: **below 768px, rank 1 and rank 8 are never on
screen together.** It accepted it as a cost about *prices* — comparing the cheapest
against the dearest means scrolling.

The Owner's act makes that cost larger than ADR-0009 priced it. If the judgement is about
fit, then what cannot be held side by side is not two numbers but two *offers* — a
specification against a specification, a photograph against a photograph, four screens
apart. Scrolling does not solve that; memory has to.

**This is named and not solved here**, and it is a different problem from the one this
ADR closes. "The sheet is too long" has been answered: it is as long as the reading. "The
Owner cannot see the first Quote and the fifth at the same time" has not been asked
properly, and it is the better ticket, because it admits answers — a summary line per
Quote, a comparison surface, a way for the Owner to rule a Quote out and collapse it —
that shortening the sheet by guesswork does not. It is [#158](https://github.com/Mikepeerawit-com/tender-tracker/issues/158).

## Consequences

- **The measurement is re-derivable, which it has twice not been.** `npm run
  screen-length` prints the tables above. Every figure in ADR-0009, ADR-0026 and #151 was
  produced by a scratch file that no longer exists, and two of them were wrong. ADR-0026's
  opening table said the tender list was 1100px when it was 1664px, corrected eighty
  minutes later by `1e43763`. ADR-0009's 189px per card was wrong for four weeks and was
  found only because this ticket measured for a different reason. #151's own figures, for
  the record, were right — 4,147px against the 4,148px measured here. A number nobody can
  re-derive is a number nobody can check, and the difference between eighty minutes and
  four weeks was luck rather than diligence.
- **It reports and asserts nothing**, for the reason [ADR-0016](0016-a-check-must-be-able-to-fail.md)
  gives. A pinned height either carries a tolerance wide enough that it can never fail, or
  a tight one that fails on whichever face the runner substituted — the same trap ADR-0029
  avoided by asserting on a computed font size rather than on a width. So the tool is a
  review surface like the contact sheet, out of `npm test` by the project filter and never
  in CI.
- **`working-sheet.layout.test.tsx` is untouched and still the bar.** Nothing scrolls
  sideways at 390px; the table returns at 768, 1024 and 1280. This decision changes no
  markup, so the guard had nothing to catch — which is itself the evidence that the
  outcome is a decision and not a diff.
- **Latin heights here are indicative.** `next/font` supplies Fira Sans in the real app
  and not in the harness, so unless it is installed locally the Latin text is drawn by the
  CJK face behind it. `zh-Hans` is the closer of the two to what ships, which is the
  locale [#68](https://github.com/Mikepeerawit-com/tender-tracker/issues/68) says to judge
  first anyway. The report names the faces that resolved.
- **The open risk is that five is not the ceiling.** Five Quotes per Item is what the
  business carries today. ADR-0004 makes competing Assignees normal and ADR-0009 designed
  for eight, so an Item can hold more, and the page grows linearly with them. If Tenders
  routinely arrive with eight, the co-visibility question above stops being the better
  ticket and becomes the urgent one.
