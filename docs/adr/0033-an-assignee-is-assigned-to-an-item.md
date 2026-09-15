# An Assignee is assigned to a Tender Item, not to a Tender

_Written by the sellability design session of 15 September 2026._

**Status:** accepted. **Supersedes the cardinality decision of [ADR-0004](0004-assignees-compete-not-divide.md)** — "assignment is therefore many-to-many at the **Tender** level (a join table), never per-Item". Everything else 0004 decided stands, and is restated below because the sentence being deleted is the one a reader would have used to find it.

Taihue's Assignees compete: several work one Tender and each sources every Item they can, because comparing their Quotes is the point. That is a true statement about Taihue and a false one about most companies, who assign one person per Item and call it dividing the work. The app is being taken to other customers, and the Tender-level join is the single line of schema that makes it Taihue's app rather than the trade's.

## The decision

**Assignment lives on the Tender Item.** `tender_item_assignees` replaces `tender_assignees`, primary key `(tender_item_id, user_id)`.

Both ways of working then fall out of one model, with no mode, no flag and no setting:

- **Several Assignees on one Item is competing.** Taihue's way, unchanged, and still the behaviour the comparison exists for.
- **One Assignee per Item is dividing.** Every other company's way, and now expressible rather than configurable.

Nothing asks an organisation which it does. The cardinality of the rows *is* the answer, and a customer can work both ways on the same Tender — the item nobody has a supplier for goes to three people, the routine ones to one each — which no per-org setting could have expressed.

## Why not a setting

A `sourcing_mode` column on `orgs` was the obvious alternative, and it costs two code paths through the four features that read assignment: My work, Sourcing Overdue, the quote-deadline Reminder's targeting, and the Working Sheet's ranking. Two paths means every future change to any of them is made twice and tested twice, forever, in a product with one developer. It also means the first customer who works both ways on one Tender is told their way of working is invalid.

The per-Item join is strictly more expressive than the flag and costs one migration. A flag would have been the cheaper thing to type and the more expensive thing to own.

## What survives from ADR-0004 unchanged

Restated because 0004 is now partly superseded and a reader may stop at the banner:

- **There is deliberately no unique constraint on `(tender_item_id, supplier_id)`.** Two Assignees ringing the same supplier and getting different prices is the most interesting signal in the dataset. A unique index would delete it and would silence the second caller.
- **`quotes.created_by_user_id` is load-bearing**, not audit trim. It is the only thing identifying whose Quote won.
- **Only an Assignee may enter Quotes**, now resolved per Item rather than per Tender. Still trivially bypassable by self-assigning, and still not a security control — it is the step that enrols you in the Item's reminders before you start work.
- **No Supplier Found** still exists and still means what it meant. An Assignee can fail to source an Item they are assigned, so no reminder may demand full coverage.
- **Outcome News still reaches every Assignee who quoted the Item**, which was already keyed on who quoted rather than on who was assigned, and so needs no change at all.

## Consequences

- **The backfill is a cross product, and it is the honest one.** Every existing `(tender_id, user_id)` row becomes one row per Tender Item on that Tender, because under competing that is exactly what it meant. No existing Assignee gains or loses work.
- **My work gets simpler, not harder.** It already lists Items rather than Tenders, and it currently reaches them by joining through the Tender. It now reads assignment directly.
- **Sourcing Overdue and the quote-deadline Reminder narrow to the Items a person holds.** Today the Reminder reaches Assignees who have entered *no Quotes at all* on the Tender, which under dividing would chase somebody about work that was never theirs. After this it names their own Items, which is also a better message for Taihue.
- **A Tender Item added after assignment has nobody on it, and that is a new problem this ADR does not solve.** Under the Tender-level join a new Item inherited the Tender's Assignees for free; it now arrives with an empty set and is invisible to everybody until somebody is put on it. It must be visible on the Tender as work outstanding — the same posture **Unassigned** Reference Images already have, and for the same reason: the ones nobody has placed are the ones with work left in them.

  **Do not reuse the word "Unassigned" for it.** That term is taken, it means a Reference Image nobody has said which Item it is of, and two meanings for one word in this glossary is the fault the glossary exists to prevent. Naming this state, and deciding whether creating an Item offers an assignment step inline, is owed before the migration ships.
- **ADR-0013 cites 0004 for "everyone inside an org sees everything, cost and margin included".** That was already made false by [ADR-0020](0020-an-assignee-sees-their-own-quotes-and-no-money.md), and this ADR does not change it either way. Noted so the next reader does not take the citation as current.
