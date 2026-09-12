/**
 * Who is looking at this Tender, and therefore which screen they get.
 *
 * ADR-0020 introduced the first visibility tier in the app: on a Tender they are an
 * Assignee but not the Owner of, a user sees their own Quotes and no money at all. The
 * tier is Owner-versus-everybody-else on **one Tender** — never a rank in the
 * organisation, which is why nothing here asks about `is_org_admin`. An Org Admin looking
 * at somebody else's Tender is a reader like any other, exactly as `mayCorrectQuote` has
 * it, and that is the sentence this file exists to make hard to write differently twice.
 *
 * Two sentences live here: who owns a Tender, and which Quotes are yours. Both screens
 * that reduce — `loadTenderScreen` (#92) and `loadItemSourcingScreen` (#93) — ask them
 * rather than restating them, which is the whole point of the file.
 *
 * It is deliberately *not* `server-only`. The loaders ask on the server, and
 * `mayCorrectQuote` asks from a module the Quote list and the edit page both reach in a
 * browser test — the same reason `mayCorrectQuote` itself lives outside
 * `@/lib/quotes/quotes` rather than beside the writes it guards.
 *
 * **This is not what makes anything safe.** It shapes what a loader returns, so that the
 * hidden data is absent from the payload rather than present behind a flag. Org isolation
 * is RLS's job and stays entirely RLS's job.
 */

/**
 * Does this reader own this Tender?
 *
 * Two arguments and neither is a role. `ownerUserId` is nullable because the Tender may
 * not have been read at all — a bad link, or another org's id, which RLS makes the same
 * answer — and a Tender nobody can read is nobody's to own. Answering `false` there is
 * what makes the reduced screen the fail-closed default.
 */
export function ownsTender({
  ownerUserId,
  callerId,
}: {
  /** The Tender's `owner_user_id`; null when the Tender could not be read. */
  ownerUserId: string | null;
  callerId: string;
}): boolean {
  return ownerUserId !== null && ownerUserId === callerId;
}

/**
 * The Quotes among these that this reader sourced, as much of each as is theirs to see.
 *
 * The other half of ADR-0020, and here for the reason `ownsTender` is: two screens
 * subtract, and a rule written out twice is a rule that gets fixed in one of the two.
 * `loadTenderScreen` asks it of one Item's Quotes off the comparison sheet and
 * `loadItemSourcingScreen` of the Item it is about, and both are asking the same thing —
 * **a Quote is yours if you rang the supplier**. `sourcedByUserId` is a column, never
 * derived from anything, which is what makes that answerable at all.
 *
 * Filtering rather than flagging, deliberately: what comes back is the list the screen
 * draws, so a rival's price is absent from the shape rather than sitting in it behind a
 * boolean somebody has to remember to read.
 *
 * **One field is subtracted from the rows that survive**, which is why this does more than
 * filter. A Quote the Owner has ruled out stays in its Assignee's list looking exactly like
 * any other, because ADR-0032 leaves them untold: a ruled-out-for-fit judgement is worth
 * hearing and is parked in #168 with the notification surface it needs, so until then the
 * mark — and the reason, which is the readable half — is the Owner's alone. Done here rather
 * than in each loader for the reason the filter is: the next reduced screen inherits it
 * instead of remembering it.
 *
 * Generic over the row rather than typed to `Quote`, so that asking it costs no import
 * from `@/lib/quotes/quotes` — which is `server-only`, and would drag this file into
 * being so too. `ruledOut` is required of the row for the same reason `sourcedByUserId` is:
 * a caller handing rows that have no such field is a caller this cannot answer for.
 */
export function yourQuotes<T extends { sourcedByUserId: string; ruledOut: R | null }, R>(
  quotes: T[],
  callerId: string,
): T[] {
  return quotes
    .filter((quote) => quote.sourcedByUserId === callerId)
    .map((quote) => ({ ...quote, ruledOut: null }));
}
