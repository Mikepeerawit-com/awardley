# The edit screen is not a transcript of the table

> **Applies [ADR-0026](0026-the-tender-detail-has-parts.md)'s rules to the Owner's other
> long screen, and settles one thing that decision left ambiguous:** whether a block that
> is a `Fold` on one screen has to be a `Fold` on every screen. It does not.

The tender edit screen was **3791px at 390px**, the second-longest in the app after the
Tender detail, and unlike that one it had never been looked at. It is where the Owner
corrects what a client asked for: the Tender's own fields, one form per Item, an uploader,
a gallery of the client's pictures, and the Assignee controls.

Measured off the contact sheet, `main` alone came to 3629px:

| Part | Height |
|---|---|
| **Tender items** | **1880px** |
| The Tender's own fields | 858px |
| Reference images | 451px |
| Assignees | 208px |
| The screen header | 104px |

**Half the screen is the Items**, and the shape it had was one row per column of the
database table: four labelled fields stacked down the page, then Save, then Remove, ×3,
then a fourth identical block that was empty.

## Four changes, and only one of them hides anything

**1. A quantity and its unit are one fact, and now they are one row.** They were a
`sm:grid-cols-2` pair, which at 390px means stacked: two 66px rows for a number and a
word that between them are rarely twelve characters. Two columns at every width now.
Product and Description keep the `sm:` — they are prose, and a 165px input for either is
worse than a second row.

**78px × four forms on this screen**, and it lands on the new-Tender screen too, which
draws the same `TenderItemInputs` for every row the Owner adds.

**2. Save and Remove share a row.** They are two server actions and therefore two
`<form>`s — a submit posts to one form — but they were also two stacked rows with the
destructive one 12px directly under the one pressed every time. Save at the leading edge
and Remove at the trailing one is **56px off each Item card, and it puts the width of the
card between the two targets instead of a finger's width**. `form="…"` is what allows it:
a submit button may sit outside the form it posts, addressed by id, so both forms render
their hidden fields and their refusal notice and nothing else.

**3. The blank Item is shut until it is asked for.** Four empty inputs and a button is
422px, and it sat permanently at the foot of a screen already 3629px long. Nobody arrives
here to look at a blank Item. It is a `Fold` now, `level={3}` because the section above
already spends the `<h2>`.

**A refused add reopens it, and that needs no state beyond the prop.** React writes `open`
only when its own value changes, so a submit that comes back with a problem flips
`false → true` and the panel returns with what was typed still in it — while a fold the
reader opened by hand survives a successful add untouched, because React never wrote
`open` and so has nothing to undo.

**4. The screen's parts are `Section`s.** Its headings were `text-sm font-medium` — the
tier ADR-0026 replaced, drawn before that decision existed. They are the middle tier now,
with anchors and accessible names, and the same treatment as every other part of the app.

## The same block is a fold where it is looked up and a section where it is the work

Assignees are behind a `Fold` on the Tender detail and inside a `Section` here, and that
is the rule rather than an oversight. ADR-0026's test is *did the reader arrive with this
question* — on the detail screen, *who else is on this?* is a lookup; on the edit screen,
changing who is on it is one of the things the screen exists for.

**That is also where a heading had gone missing.** `AssigneeControls` drew its own `<h2>`
until the detail screen's fold took the heading over, at which point the component stopped
drawing one — and this page, which renders it bare, was left with an unlabelled list of
names. It went unnoticed because the guards walk what is *drawn*, and an unlabelled block
draws fine. Restoring it is the only part of this work that makes the screen taller.

## What it measured

| | Before | After |
|---|---|---|
| Editing a tender, `en` | 3791px | **3085px** |
| Editing a tender, `zh-Hans` | 3759px | **3049px** |

**Down 19%, with one form hidden and no field removed from the screen.** The three Items
are still open, still all four fields each, still individually saved.

## What was considered and not done

**Folding the Item forms themselves** would take another ~1000px — three 324px forms
behind three summaries showing the product name. It is not obviously wrong; the forms are
already independent units of work with their own Save. It is left alone because it changes
what the screen *is*, from "everything about this Tender, editable" into "a list you open
one at a time", and that is a decision to make deliberately rather than as the tail of a
density pass.

**A jump bar.** `TenderSections` would draw over three Sections and the screen is 3.6
screenfuls. Left off: the labels this screen has — *Tender items*, *Reference images*,
*Assignees* — wrap to two rows of sticky chrome at 390px, and 88px permanently at the top
of a form is a worse trade than the scroll it saves. It becomes worth revisiting if those
labels get shorter.

## Consequences for the guards

**`"editing a tender, adding an item"` is a screen in the shared record**, for the reason
ADR-0026 gives: a shut `<details>` fails `checkVisibility()`, so with the fold down the
contrast walk, the 44px floor and the 390px measure all stop at its summary bar and four
inputs and a submit go unwalked. Most of what is behind it has a twin on `"recording a
tender"`, which draws the same `TenderItemInputs` in the open — but *most* is not the
standard [ADR-0016](0016-a-check-must-be-able-to-fail.md) sets, and an `Input` is
`bg-transparent`, so its text on a fold's `--card` is a contrast pair that surface does not
have anywhere else.

**Both edit records are drawn by one function rather than written out twice.** The Tender
detail's folds-open twin is a full second copy because it is genuinely a different screen —
the Owner's rather than the Assignee's, the working sheet in place of the sourcing list.
This pair differs by one boolean, and sixty duplicated lines that differ in one place are
sixty lines that can drift apart while both keep passing.

**No control-row budget was set, and that is unchanged.** `density.layout.test.tsx` says
in its own header why this screen has none: #98 reduced two screens and this was not one of
them, so a budget written now would be a number nobody set. This work reduced it, which
would be the moment to write one down — except that the number would still be measured off
the screen rather than chosen, which is the thing that file calls not a check. The screen
carries every shared guard, as it did before.
