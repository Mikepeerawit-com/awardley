# The working sheet leads with the figure it ranks on

_Written by [#150](https://github.com/Mikepeerawit-com/tender-tracker/issues/150), the question [ADR-0026](0026-the-tender-detail-has-parts.md) parked rather than took._

**Status:** accepted. Closes the open question ADR-0026 recorded under _"Open, and deliberately not decided here"_; that section now points here. Nothing is superseded — [ADR-0009](0009-comparison-sheet-reflows-at-768px.md)'s failure bar still holds, and [ADR-0020](0020-an-assignee-sees-their-own-quotes-and-no-money.md) is what this decision leans on.

Rows on the comparison working sheet are ordered by the converted figure. `isLowest` marks it, the line total is built from it, and the Landed Cost prefill is filled from it. **It was also the quietest thing on the card** — `text-xs`, muted, behind an `≈`, under the supplier's own amount at display size.

The comment defending that arrangement argued that eight competing offers _"have to read as a column of numbers rather than as eight paragraphs"_. That is the right goal and the layout lost it: `$0.06`, `CN¥0.42` and `THB 2.35` at display size are not a column of anything. The one figure that would be — the converted one, in a single currency, tabular — was the one set small and grey.

**The decision: on the Owner's working sheet, the Reporting Currency figure leads.** It takes display size in the numeral stack, keeps its `≈`, its rate `title` and its stale-rate chip, and carries the per-unit qualifier on its own line. The supplier's own amount drops to a muted secondary line beneath it. **The Assignee's quote card does not move.**

## Why the glossary was not the obstacle it looked like

`CONTEXT.md` holds that a Quote is stored in the currency the supplier quoted, and that conversion is for display only and is always **marked** as derived. Read as a rule about *prominence*, that sentence forbids this change. Read as a rule about *provenance*, it does not touch it.

It is provenance, on two arguments.

**The sentence is about what the record is.** *Stored in*, *for display only*, *marked as derived* — three clauses about the origin and status of a number, not its type scale. The codebase states the same thing harder than the glossary does: the currency is a slot picked once at entry, and a correction has no field for it, because changing it would change what the stored amount means.

**The other reading makes the glossary something it is not.** `CONTEXT.md` is a glossary and holds no rendering rules anywhere else in the file. A prominence reading would make one line of it the sole exception — a type-scale rule hidden in a definition. That is a good sign the reading is wrong rather than that the rule is unusual.

Nothing about this change makes the conversion less derived. The `≈` survives at display size, the rate and its date survive in the `title` and in the accessible name, and the stale-rate chip survives beside the figure it impeaches. The entry was sharpened from *"shown as derived"* to *"marked as derived"* in the same change, so the next reader meets the decision rather than the ambiguity.

## Why the figure the ranking uses is the figure the reader gets

**The Owner is deciding, not obeying.** What happens on this screen is a choice about which Quote to purchase, and price is weighed against the supplier, the lead time and whatever else the Owner knows. That makes the **magnitude** of a gap load-bearing, not just its direction: *how much* cheaper decides whether a cheaper supplier is worth taking. A ranking alone answers the direction and says nothing about the size, and three currencies at display size answer neither.

**The Reporting Currency figure is the only one every row shares.** It is what the ordering is computed from, so leading with it means the column a reader scans is the column the sheet was sorted by. Anything else asks them to trust an order they cannot verify by eye.

**A Quote already in the Reporting Currency needs no second line, and that is what completes the column.** Such a row draws one figure at display size and always did. Inverting the converted rows makes *every* row in the column a Reporting Currency figure at one size — which is the column of numbers the original comment asked for and could not produce while the currencies disagreed.

## Why the two screens now differ

The Assignee's quote card carried a comment binding it to this one, _"so the two screens never disagree about which number is the real one"_. That binding is retired deliberately, and the comment now says so.

They are not disagreeing about which number is real. They are read by different people performing different acts, a line [ADR-0020](0020-an-assignee-sees-their-own-quotes-and-no-money.md) already draws hard. **An Assignee rings a supplier and will transact in that supplier's currency**, so the supplier's own amount is the operative number on their card. **An Owner ranks**, and ranks in the Reporting Currency. Keeping the two bound would cost one of them its lead figure to buy a consistency neither reader benefits from.

The cost of the split is that a future tidy-up may read the difference as an accident. That is why the binding comment was **replaced rather than deleted**: the divergence has to be findable as a decision from inside the file that looks wrong.

## Consequences

- **The change is drawing, not arithmetic.** Ranking, the lowest-price marker, the line total and the Landed Cost prefill already computed in the Reporting Currency. The screen was changed to match what they compute; none of them was touched.
- **A larger figure is a wider figure, and ADR-0009 is the bar it must clear.** The working sheet's suite already pins that nothing scrolls sideways at 390px and that the table returns at 768, 1024 and 1280. Those guards are the regression net for this change, and they are the reason it is safe to make.
- **The decision itself is pinned, by font size and never by width.** One assertion states that the converted figure is drawn larger than the supplier's amount. It reads a computed font size, because no Latin face in either stack resolves in the headless browser and a width measured there is a fact about Chromium's substitute — a different fact on the CI runner and a third on a phone. A font size comes off the class rather than the face.
- **The converted figure is now walked by the numeral-stack guard for free.** It gained the shared money treatment, so the existing walk that asserts every figure is mono and tabular now covers it without a new test.
- **The rate `title` is what identifies the leading figure**, to a reader on a mouse and to the test alike. It is an attribute the decision requires the figure to keep, which is why the assertion could be written without adding a hook to the markup — this repo has none anywhere.
- **The open risk is the secondary line going unread.** The supplier's own amount is what will be invoiced, and it is now small and grey. If Owners start missing it, the fallback is to raise it back to equal weight rather than to re-invert — the column is the thing worth keeping.
