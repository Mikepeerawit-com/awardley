# The Tender detail has parts, and what is looked up folds away

> **Amends [ADR-0022](0022-one-region-one-left-edge.md) with nothing, and settles what it
> left open.** That decision gave every screen one region and one left edge and made the
> *measure* the only per-screen width. It says nothing about what a screen is divided into
> **down** the page, because until now no screen was long enough for the question to arise.
> One is.

The Tender detail is the longest screen in the app and it was one undifferentiated column.
Measured off the contact sheet at 390px, which is the width [ADR-0019](0019-the-visual-system-is-built-for-a-chinese-reader-on-a-phone.md)
says to judge this app at:

| Screen | Height at 390px |
|---|---|
| **A tender** (Owner) | **4786px** |
| Editing a tender | 3827px |
| Sourcing an item | 2338px |
| A tender somebody else owns | 1932px |
| The tender list | 1664px |
| My work | 844px |

Five and a half screenfuls, and **two `<h2>`s in the whole of it** — one at
`text-lg font-semibold` on the Outcome panel and one at `text-sm font-medium` on the
Assignee controls, with the working sheet and the sourcing list drawing none at all. So the
screen had no middle heading level: nothing a screen reader would list as a landmark, and
nothing a reader scrolling could use to know where they had got to.

That matters most on the path this product is built around. An Assignee arrives here from a
Group Robot link with a **specific question** — which quote do I pick for the second Item,
when did this go out, who else is on it — and had exactly one way to answer any of them,
which was to thumb past everything else.

## Three changes, and none of them removes anything from the screen

**1. Every part is a `Section`: a heading, an anchor and an accessible name.** One heading
treatment, stated once, at the middle tier of a three-tier scale — `text-2xl` for the
screen's own `<h1>`, `text-base` here, 10.5px `.field-label` beneath. Far enough apart to
be told apart at arm's length on a phone, which the old two-size screen could not manage.

**2. `TenderSections` pins the list of those parts to the top.** Plain `<a href="#…">`
fragments, so the browser's own anchor scroll does the work: instant, before hydration, and
honouring `prefers-reduced-motion` because nothing sets `scroll-behavior: smooth`.

**3. What is read once, or never, is behind a `Fold`.** The test is whether the reader
arrived with the question. *What do I owe*, *what do these Items cost*, *when is this due*
are what they came for and are never folded. *Who owns it*, *what date it arrived*, *what
the notes say*, *who else is assigned* are what they look up.

**The two deadlines were promoted out of the facts grid.** They were two of six cells all
drawn at one weight; they are the two the screen turns on. They now sit above the work as a
*reading* rather than a value — a lamp and a sentence, off the same
`tenders.row.due.<kind>.*` keys the worklist row and My work already say, so "Quotes due
tomorrow" means tomorrow on all three screens and there is no second ladder to drift.

## `<details>`, not state

`Fold` is a native `<details>`, which is why it is a Server Component with no `"use client"`
on it. The browser opens and closes it, so it works before hydration and inside the WeCom
webview over a phone network — the slowest path in the product, and the same reasoning
[ADR-0024](0024-the-theme-is-the-readers-not-the-devices.md) applies to the theme. It is
keyboard-operable and announced as a disclosure with nothing written to make it so.

**Open is derived, never remembered**, the posture `ItemDisclosure` already takes: the
screen opens showing the work that is left, not what somebody poked at last week.

**A jump to a shut fold scrolls it into view and leaves it shut.** No markup opens a
`<details>` from a fragment — `:target` can style one and cannot open it — and the
alternatives are a script, which costs this component its whole reason for being
server-rendered, or opening every fold by default, which puts the scroll back.

## The folds are not jump destinations, and the bar can decline to draw itself

A `Fold` is 44px whether open or shut, so a jump link to one saves no scroll. Only
`Section`s are destinations, and `TenderSections` draws nothing below two of them.

That rule is what keeps the bar honest, and `density.layout.test.tsx` priced the
alternative exactly: listing the two folds took the Assignee's Tender detail from **8
control rows to 10 in `en` and 9 in `zh-Hans`** — a navigation control added to a 1932px
screen with no distance in it to cover. With the rule, the Owner's screen has two or three
Sections and gets the bar; the Assignee's has one and does not.

The bar also stays **inside the region** rather than bleeding to the window's edge. The
full-bleed version is one `-mx-6` away and was written and taken out again: `ScreenBody`
puts the region's padding on the parent, so pulling back by it makes the bar wider than the
element containing it, which is what `overflowing` in `@/test/layout` watches for. It is
the same trade `app-header.tsx` refused for eight pixels of ghost-button inset.

## What this bought, measured

| Screen | Before | After |
|---|---|---|
| A tender (Owner) | 4786px | **4404px** |
| A tender somebody else owns | 1932px | **1603px** |

**The Owner's screen is 7% shorter and that is not the win.** The win is that it has parts
with names, a way between them, and a heading level to navigate by; the Assignee's screen,
where the folds are a larger share of it, is 17% shorter.

**What is still long is the working sheet itself**, and its *structure* is deliberately
untouched. Three Items with their ranked Quotes is roughly 3400px of that 4404, and
shortening it properly means reopening [ADR-0009](0009-comparison-sheet-reflows-at-768px.md)
— the stacked quote cards below 768px are what cost the height, and they are what that ADR
chose over a sideways-scrolling table. **This ADR is not grounds to change that.** If the
sheet's length is taken up as a problem, it wants its own decision and its own measurements.

## The quote card says each thing once

What *was* done to the sheet is three corrections, none of which touches ADR-0009's
breakpoint or its one-tree rule:

**The quote count was stated twice, on adjacent lines.** The sheet had a
`comparison.item.quantified` of its own reading "40000 × piece · 3 quotes", directly above
a `SourcingChips` chip reading "3 quotes". The chips win — they distinguish Quoted from No
Supplier Found from Not Yet Sourced, which the tail of a sentence cannot — and the sheet's
copy of the key is deleted in favour of `tenders.item.quantified`, which every other screen
showing an Item already uses. That also picked up the `, number` formatting the shared key
has and the sheet's never did: the quantity reads 40,000 rather than 40000.

**The quantity was repeated on every card.** `comparison.quote.lineTotal` was
"Line total ({quantity} {unit})" — a multiplier identical across every Quote on the Item and
already stated on the Item's own row a few lines above. It is "Line total" now, one key
serving both the column heading and the card.

**The card had no division between describing a Quote and pricing it.** Supplier, sourcer
and product-match sat at the same weight and rhythm as the price and the line total, so
eight lines arrived flat and the reader parsed the card to find the figure they came for.
There is a hairline between the two halves at `max-md:` only — at a desk they are columns of
a table and the columns already say it — and the unit moved onto the price's own line, since
*0.06 of a dollar, per piece* is one fact and had been stacked as three.

## The rank rail was 40px of nothing, seven lines deep

Below 768px a Quote is a card, and the card was a two-column grid: `1.75rem` for the rank
pill, `0.75rem` of gap, and every other cell stacked down the second column. The pill is
on the first line only, so the other **seven lines each began 40px in from the card's own
padding** — on a 390px screen, off the one column there is.

That is width this sheet cannot spare. The names it carries are long and frequently
unbreakable: a Chinese supplier's full registered name, a product code run together as one
token. `Cell` already breaks words rather than let one push the page sideways
([ADR-0009](0009-comparison-sheet-reflows-at-768px.md)'s failure bar), so the gutter was
not paid for in white space — it was paid for in broken words.

**Only the first line is two columns now.** The rank pill, and beside it the supplier it
is ranking, which is the one cell that belongs on the pill's line and is short enough to
sit there. Everything under it spans the card: **250px of content became 290px**, a
sixth more, on every line below the first of every Quote on the sheet.

`Cell` decides that with a branch rather than with two utilities on one element.
`col-span-2` and `col-start-2` both write `grid-column`, so a cell carrying both would be
settled by the order Tailwind emits them in rather than by anything written here — the
kind of rule that holds until a version bump reorders the sheet.

**It bought no height, and that is the honest number.** The page is the same length; what
changed is that the content is not indented for no reason and has a sixth more room before
it wraps. The 32px that did come off came from something else the rail was hiding:
`empty:hidden` on the card cells. A Quote with no photographs still drew the photo cell's
`py-1`, because `ImageCountBadge` returns `null` and an empty `<td>` is still a box. Four
photoless Quotes, eight pixels each. The utility is `max-md:` only — at a desk an omitted
cell takes its column with it and every row below stops lining up.

## Open, and deliberately not decided here

> **Since answered by [ADR-0029](0029-the-sheet-leads-with-the-figure-it-ranks-on.md),
> through [#150](https://github.com/Mikepeerawit-com/tender-tracker/issues/150).** The
> sheet now leads with the converted figure, on the Owner's screen only. The section below
> stands as the question that was asked; ADR-0029 is the answer and the reasoning.

**The figure the sheet ranks on is the quietest number on the card.** Rows are ordered by
`unitPriceThb`, and that figure is drawn at `text-xs` in muted ink behind an `≈`, while the
supplier's own amount is `text-xl` mono. The comment defending that arrangement argues
competing offers "have to read as a column of numbers rather than as eight paragraphs" —
which is true, and is an argument the current layout does not win: `$0.06`, `CN¥0.42` and
`THB 2.35` in three currencies at display size do not read as a column of anything.

Against changing it: `CONTEXT.md` holds that a Quote is stored in the currency the supplier
quoted and that conversion is display-only and always shown as derived. Raising the derived
figure to equal weight is a claim about which number the screen is *for*, and that is a
decision worth making on purpose rather than as a side effect of a craft pass. **It is left
as it stands, and noted here so the next person meets the question rather than the
symptom.**

## Consequences for the guards

**The focus walk now presses real keys.** `focus.layout.test.tsx` drove Tab through
`@testing-library/user-event`, which computes the next stop in JavaScript: it can focus a
`<summary>` and cannot tab *off* one, so the app's first `<details>` stopped that walk dead
on the last fold and it reported the bottom bar's two destinations as controls no keyboard
could reach. They were reachable — the same walk through the real browser visits every stop
in document order and ends on `body`, which is how the claim was settled rather than
assumed.

Pressing real keys then surfaced something the simulation had been hiding: **`<input type="date">`
is one control to that file and three stops to Chromium** — day, month and year, all
reporting the same `activeElement`. The walk used to break on any repeat, so with real keys
it would have stopped at the first date field on every form in the app. It now treats a
press that does not move focus as a composite control rather than as the end of the page,
and ends when focus returns to where it started.

The version of this bug worth fearing is the inverse of the one that happened: a simulation
*agreeing* that focus reaches everything when the engine disagrees is a green check on a
screen nobody can operate ([ADR-0016](0016-a-check-must-be-able-to-fail.md)).

**`"a tender with its folds open"` is a screen in the shared record.** A closed `<details>`
fails `checkVisibility()`, so every guard that walks these records is blind to what is
behind a fold — and `TenderFacts` is drawn nowhere else in the app, so without this its
cells would have no contrast, tap-target or 390px guard standing anywhere near them. It is
the **whole** screen rather than the two folds alone: a fixture holding just the folds draws
no prose and no form field, so it reaches for no `Measure`, and satisfying
`screens.layout.test.tsx` would have meant putting an empty one in purely to please a check.
That is a hole cut in a guard for the case in front of you, which
[ADR-0016](0016-a-check-must-be-able-to-fail.md) refuses.
