import { describe, expect, it } from "vitest";

import {
  capReached,
  noPlan,
  referenceImageCap,
  remainingUnderCap,
  effectiveMembershipCap,
  type Plan,
} from "./plan";

/**
 * The plan's arithmetic, on its own.
 *
 * No database and no fixtures: every tier's figures are a row (ADR-0040), so what is
 * checkable here is the mechanism the rows are read through — and the mechanism is the
 * half that would still be wrong if somebody typed the free tier's numbers correctly.
 * The four enforcement points each stage a real org against a real plan row; this file
 * is where the off-by-one lives, because that is the bug a staged org hides behind a
 * green create.
 */

function planWith(overrides: Partial<Plan> = {}): Plan {
  return { ...noPlan, id: "test", ...overrides };
}

describe("capReached", () => {
  it("is never reached on a plan with no cap", () => {
    // Uncapped is the absence of a number rather than a large one, so there is no count
    // that crosses it — including counts no organisation will ever reach honestly.
    expect(capReached(null, 0)).toBe(false);
    expect(capReached(null, 10_000)).toBe(false);
  });

  it("asks about the next act, not the state the org is in", () => {
    // Two of three is not at the cap, and the sentence the caller needs is about the
    // third: under the line, adding one stays under it.
    expect(capReached(3, 2)).toBe(false);
  });

  it("refuses the act that would cross the line", () => {
    expect(capReached(3, 3)).toBe(true);
  });

  it("refuses an organisation already over its cap without destroying anything", () => {
    // A plan lapsed from paid to free leaves an org holding more than the new tier
    // allows. It is refused exactly like one sitting on the line — and it is only
    // *refused*, which is the whole of what a cap does: nothing here deletes a count.
    expect(capReached(3, 6)).toBe(true);
  });

  it("lets an org two under its cap add two, and not three", () => {
    // The `adding` argument is what makes a batch all-or-nothing rather than a race
    // between its own members.
    expect(capReached(5, 3, 2)).toBe(false);
    expect(capReached(5, 3, 3)).toBe(true);
  });

  it("refuses everything on the plan a failed read falls back to", () => {
    // `noPlan` allows nothing, so an unreadable row comes out as a refusal somebody
    // reports rather than as a free upgrade.
    expect(capReached(noPlan.openTenderCap, 0)).toBe(true);
    expect(capReached(noPlan.membershipCap, 0)).toBe(true);
  });
});

describe("remainingUnderCap", () => {
  it("is no number at all on a plan with no cap", () => {
    // Null passes straight through rather than becoming a large allowance, so a picker's
    // comparison is one an uncapped plan never enters.
    expect(remainingUnderCap(null, 0)).toBeNull();
    expect(remainingUnderCap(null, 10_000)).toBeNull();
  });

  it("is what is left, and agrees with capReached on the act after it", () => {
    // The two are one piece of arithmetic read from two ends, and the point of testing
    // them together is that they cannot drift: whatever this says is left is exactly what
    // the server will accept before it starts refusing.
    expect(remainingUnderCap(5, 3)).toBe(2);
    expect(capReached(5, 3, 2)).toBe(false);
    expect(capReached(5, 3, 3)).toBe(true);
  });

  it("is nothing left when the count is on the line", () => {
    expect(remainingUnderCap(3, 3)).toBe(0);
  });

  it("is never negative for an org already over its cap", () => {
    // A plan lapsed from paid to free holds more than the new tier allows. "How many
    // more" is none — minus three would read as an allowance to anything comparing it
    // with `>`, which is the one way this could hand back a licence to add.
    expect(remainingUnderCap(3, 6)).toBe(0);
  });

  it("allows nothing on the plan a failed read falls back to", () => {
    expect(remainingUnderCap(noPlan.photosPerItemCap, 0)).toBe(0);
  });
});

describe("referenceImageCap", () => {
  it("is the per-Item allowance times the Tender's Items", () => {
    // A Reference Image arrives on the Tender and is placed on an Item afterwards or
    // never, so the per-Item promise is kept at the Tender grain, which is the grain the
    // upload actually happens at.
    expect(referenceImageCap(planWith({ photosPerItemCap: 5 }), 3)).toBe(15);
  });

  it("is no cap at all when the per-Item cap is none", () => {
    expect(referenceImageCap(planWith({ photosPerItemCap: null }), 3)).toBeNull();
  });

  it("allows nothing on a Tender with no Items yet", () => {
    // Zero rather than the per-Item figure: there is nothing to place an image on, so
    // the allowance a Tender has earned is nothing. It is not `null` — `null` here would
    // read as uncapped, which is the opposite answer.
    expect(referenceImageCap(planWith({ photosPerItemCap: 5 }), 0)).toBe(0);
  });
});

/**
 * The two halves of the cap on live Memberships (#180), and the rule that neither may
 * override the other.
 *
 * Every other cap in this file has one source. This one has two — what the tier allows
 * and what the subscription pays for — and the whole of the arithmetic is which one wins.
 * Pure, and tested pure, because both wrong answers are silent: the wrong way round, an
 * organisation adds people nobody is paying for, and there is no screen on which that
 * looks like anything.
 */
describe("effectiveMembershipCap", () => {
  it("is the plan's own cap when nothing is being paid for", () => {
    // The free tier, and every organisation that has never subscribed: the tier's figure
    // is the whole answer, which is what keeps #179's enforcement points unchanged for
    // everybody who has not met Stripe yet.
    expect(effectiveMembershipCap(planWith({ membershipCap: 3 }), null)).toBe(3);
  });

  it("is uncapped when neither half states a number", () => {
    // Null is the absence of a number on both sides, and the absence of both is still an
    // absence rather than a zero.
    expect(effectiveMembershipCap(planWith({ membershipCap: null }), null)).toBeNull();
  });

  it("is what was paid for when the tier states no cap", () => {
    // The ordinary paid organisation. The `paid` row promises nothing but "no cap"
    // (#179), so without this half a subscription would be a licence to add people it is
    // not paying for — and a cap that fails in that direction is the one that costs
    // money rather than a refusal.
    expect(effectiveMembershipCap(planWith({ membershipCap: null }), 5)).toBe(5);
  });

  it("is the tighter of the two when both state a number", () => {
    // Neither half may be lifted by the other, in either direction. A tier allowing three
    // does not become five because somebody bought five, and a subscription for two does
    // not become three because the tier would have allowed three.
    expect(effectiveMembershipCap(planWith({ membershipCap: 3 }), 5)).toBe(3);
    expect(effectiveMembershipCap(planWith({ membershipCap: 5 }), 2)).toBe(2);
  });

  it("allows nothing on the plan a failed read falls back to, whatever was paid for", () => {
    // `noPlan` caps at zero and zero is tighter than any quantity, so an unreadable plan
    // row stays the refusal somebody reports rather than becoming an upgrade bought with
    // a subscription the row could not be read to confirm.
    expect(effectiveMembershipCap(noPlan, 5)).toBe(0);
  });
});
