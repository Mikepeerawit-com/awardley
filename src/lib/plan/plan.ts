/**
 * What an organisation's plan lets it do, as arithmetic.
 *
 * The plan is a row (`plans`, ADR-0040) and its values are data: the free tier's caps are
 * numbers on that row rather than constants here, so that changing a tier is an update
 * and not a deploy — the FX Buffer's argument, made again. What *this* module holds is
 * the mechanism, which is the part that does not change per tier:
 *
 *   * **A cap refuses the next act and never destroys data.** Every check asks "would
 *     this add cross the line", counting what exists, so an organisation over a cap —
 *     lapsed from paid to free with six open Tenders — keeps all six readable and loses
 *     only the ability to open a seventh. Nothing is deleted, hidden or locked; the
 *     surplus is simply read-only.
 *   * **Counts are derived, never stored.** "Open" is what the Tender list means by it —
 *     no Outcome recorded — and is read off the Items each time; a stored counter would
 *     be a second answer to a question the rows already answer.
 *   * **A null cap is no cap.** Uncapped is the absence of a number rather than a large
 *     one, so nobody ever picks a sentinel and nobody ever reaches it.
 *
 * Deliberately not `server-only`: the loaders read the row on the server, and the
 * arithmetic is asked from anywhere a screen or a test needs the same answer.
 */

export type Plan = {
  id: string;
  /** How many open Tenders the organisation may hold at once. Null is uncapped. */
  openTenderCap: number | null;
  /** How many live (not Disabled) Memberships it may hold. Null is uncapped. */
  membershipCap: number | null;
  /**
   * How many Quote Photos one Tender Item may carry across all of its Quotes, and how
   * many Reference Images a Tender may carry per Item it has. Null is uncapped.
   */
  photosPerItemCap: number | null;
  /** Whether the Working Sheet draws money at all — the ADR-0020 seam, drawn per plan. */
  moneyLayer: boolean;
};

/**
 * The plan every check assumes when the row could not be read.
 *
 * That cannot happen for a caller RLS let this far, and it is written down anyway
 * because the two directions it could fail in are not equal: a fallback that allowed
 * everything would turn a broken read into a free upgrade, while one that allows nothing
 * turns it into a refusal somebody will report. Zero rather than the free tier's figures,
 * so that no tier's numbers live in code — which is the whole reason they are a row.
 */
export const noPlan: Plan = {
  id: "none",
  openTenderCap: 0,
  membershipCap: 0,
  photosPerItemCap: 0,
  moneyLayer: false,
};

/**
 * Would adding `adding` more to `count` cross this cap?
 *
 * The one sentence every enforcement point asks. Phrased about the *next* act rather
 * than the current state on purpose: an organisation already over the line is refused
 * exactly like one on it, and one under it by two may add two but not three — which is
 * what makes a batch of pictures all-or-nothing the way `pendingProblem` already has it.
 */
export function capReached(cap: number | null, count: number, adding = 1): boolean {
  return cap !== null && count + adding > cap;
}

/**
 * How many more may be added before this cap is reached — the same arithmetic as
 * {@link capReached}, turned round so a picker can hold it.
 *
 * The enforcement points ask "would this cross the line" because they are answering one
 * act. A picker is answering a different question: it has to refuse *at the pick*, before
 * an act exists, and the only thing that lets it do that is knowing what is left.
 *
 * Why that matters and is not a nicety: a Quote Photo is signed after the Quote row is
 * written, so a `plan_limit` raised there lands on a form whose only offer is a retry —
 * and a retry of the same batch against the same standing cap is refused every time,
 * forever. It is exactly the trap `too_many` was moved to the picker to avoid. The server
 * check stays where it is and stays the gate; this is what stops anybody reaching it.
 *
 * **Never negative.** An organisation lapsed from paid to free holds more than the new
 * tier allows, and the answer to "how many more" is none — not minus three, which would
 * read as an allowance to whatever compared it with `>`. It is also the honest answer:
 * nothing is deleted, the surplus is simply read-only.
 *
 * Null is uncapped and passes straight through, so a caller's check is `allowance !== null
 * && wanted > allowance` and an uncapped plan never enters the comparison at all.
 */
export function remainingUnderCap(cap: number | null, count: number): number | null {
  return cap === null ? null : Math.max(0, cap - count);
}

/**
 * How many live Memberships this organisation may hold, once what it *bought* is taken
 * into account as well as what its tier allows (#180).
 *
 * The plan's `membershipCap` is what the tier permits; `paidMemberships` is how many
 * people the Stripe subscription pays for, copied onto the org row from the quantity on
 * the subscription. The effective cap is the tighter of the two, and neither may lift the
 * other:
 *
 *   * A subscription for five on a tier allowing three is still three. The tier is the
 *     product's promise and buying more of a smaller thing does not enlarge it.
 *   * A subscription for two on the uncapped `paid` tier is two. This is the direction
 *     that matters most: `paid` promises "no cap" precisely so its figures cannot go out
 *     of date, so without this half every paying organisation would be able to add people
 *     nobody is paying for, silently and with no screen on which it looks wrong.
 *
 * **Null on either side is the absence of a number, never a large one** — the same rule
 * {@link capReached} is written to, so an uncapped tier with no subscription comes out
 * `null` and enters no comparison at all. The arithmetic is `Math.min` rather than a
 * chain of comparisons for the same reason: both figures are counts of people, and the
 * tighter of two counts is a minimum.
 *
 * Quantity changes made in Stripe's billing portal reach this figure through the
 * subscription webhook, which re-reads and rewrites absolute state — so an organisation
 * that buys two more people is allowed them on the next act, and one that gives two back
 * is refused the next add without anything being deleted.
 */
export function effectiveMembershipCap(plan: Plan, paidMemberships: number | null): number | null {
  if (plan.membershipCap === null) return paidMemberships;
  if (paidMemberships === null) return plan.membershipCap;

  return Math.min(plan.membershipCap, paidMemberships);
}

/**
 * How many Reference Images a Tender with this many Items may carry.
 *
 * A Reference Image arrives on the Tender and is placed on an Item afterwards, or never
 * (**Unassigned**, CONTEXT.md) — so a per-Item cap cannot be asked of it at upload, which
 * is the moment the ticket says to ask. The Tender's allowance is the per-Item cap times
 * its Items: the same promise, kept at the grain the act actually happens at.
 */
export function referenceImageCap(plan: Plan, itemCount: number): number | null {
  return plan.photosPerItemCap === null ? null : plan.photosPerItemCap * itemCount;
}
