import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { signIn } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service-client";
import {
  memoryCookieStore,
  type SessionCookieStore,
} from "@/lib/supabase/session-client";

import { tenderOutcome } from "./outcome";
import {
  addAssignee,
  addTenderItem,
  byNameThenId,
  createTender,
  getTender,
  listTenders,
  recordSubmission,
  removeAssignee,
  removeTenderItem,
  setItemOutcome,
  updateTender,
  updateTenderItem,
} from "./tenders";

const password = "correct-horse-battery-staple";

// A literal, not `new Date()`: the clock is resolved at the request boundary and passed
// down (ADR-0010), and nothing here turns on when the disabling happened.
const disabledAt = "2026-08-01T00:00:00Z";

/**
 * The instant an edit is made at, for the same reason. It decides only whether a
 * reminder re-dated by a moved deadline counts as un-sent; `reminders.test.ts` is where
 * that turns on the day, and nothing in this file does.
 */
const runInstant = new Date("2026-08-10T02:00:00Z");
const run = crypto.randomUUID().slice(0, 8);

const service = createServiceClient();

/**
 * The plan both of this suite's orgs are on — its own row, never a seeded one.
 *
 * `free` caps open Tenders at one (ADR-0040), and most of this file opens more than one
 * Tender in the same org, so a suite left on the default would be testing the cap in
 * every test that is not about it. The row is inserted uncapped and the one describe
 * block that is about the cap puts a number on it and takes it off again — which is also
 * why it has to be a row of this run's own: `free` and `paid` are shared by every suite
 * running in parallel, and a test that edited either would fail somebody else's.
 */
const planId = `plan-${run}`;

const owner = { id: "", email: `owner-${run}@example.test` };
const mate = { id: "", email: `mate-${run}@example.test` };
const outsider = { id: "", email: `outsider-${run}@example.test` };

let orgId = "";
let otherOrgId = "";

/** Every Tender any test made, torn down however the test ended. */
const created: string[] = [];

function tenderInput(overrides: Partial<Parameters<typeof createTender>[0]> = {}) {
  return {
    clientName: "Bangkok General Hospital",
    title: "Surgical consumables Q3",
    dateReceived: "2026-08-01",
    internalQuoteDeadline: "2026-08-20",
    clientSubmissionDeadline: "2026-08-28",
    expectedDecisionDate: null,
    ownerUserId: owner.id,
    notes: null,
    items: [{ productName: "Nitrile gloves", description: null, quantity: 500, unit: "box of 50" }],
    ...overrides,
  };
}

async function signedInAs(email: string): Promise<SessionCookieStore> {
  const store = memoryCookieStore();
  const result = await signIn({ email, password }, store);

  if (!result.ok) throw new Error(`could not sign in as ${email}`);

  return store;
}

async function createOrg(name: string): Promise<string> {
  const { data, error } = await service
    .from("orgs")
    .insert({ name, plan_id: planId })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

/** Puts a cap on this suite's own plan for the length of one test, or takes it off. */
async function capOpenTendersAt(cap: number | null): Promise<void> {
  const { error } = await service
    .from("plans")
    .update({ open_tender_cap: cap })
    .eq("id", planId);

  if (error) throw error;
}

async function createMember(org: string, who: { id: string; email: string }) {
  const { data, error } = await service.auth.admin.createUser({
    email: who.email,
    password,
    email_confirm: true,
  });

  if (error) throw error;

  who.id = data.user.id;

  const { error: profileError } = await service
    .from("users")
    .insert({ id: who.id, active_org_id: org, name: who.email, email: who.email });

  if (profileError) throw profileError;

  const { error: membershipError } = await service
    .from("memberships")
    .insert({ user_id: who.id, org_id: org });

  if (membershipError) throw membershipError;
}

/** Creates a Tender as the Owner and registers it for teardown. */
async function aTender(overrides = {}): Promise<string> {
  const result = await createTender(tenderInput(overrides), await signedInAs(owner.email));

  if (!result.ok) throw new Error(`could not create a Tender: ${result.reason}`);

  created.push(result.tenderId);

  return result.tenderId;
}

/** The first Item of a Tender, which is where assignment lives now (ADR-0033). */
async function anItemOf(tenderId: string): Promise<string> {
  const { data, error } = await service
    .from("tender_items")
    .select("id")
    .eq("tender_id", tenderId)
    .order("ordinal")
    .order("id")
    .limit(1)
    .single();

  if (error) throw error;

  return data.id;
}

beforeAll(async () => {
  const { error: planError } = await service.from("plans").insert({
    id: planId,
    open_tender_cap: null,
    membership_cap: null,
    photos_per_item_cap: null,
    money_layer: true,
  });

  if (planError) throw planError;

  orgId = await createOrg(`Tenders ${run}`);
  otherOrgId = await createOrg(`Tenders other ${run}`);

  await createMember(orgId, owner);
  await createMember(orgId, mate);
  await createMember(otherOrgId, outsider);

});

afterEach(async () => {
  if (created.length === 0) return;

  await service.from("tenders").delete().in("id", created);
  created.length = 0;
});

afterAll(async () => {
  const ids = [owner.id, mate.id, outsider.id].filter(Boolean);

  await service.from("users").delete().in("id", ids);

  for (const id of ids) {
    await service.auth.admin.deleteUser(id);
  }

  // The reference counters go with the orgs — the FK cascades.
  await service.from("orgs").delete().in("id", [orgId, otherOrgId]);

  // After the orgs, never before: `orgs.plan_id` references this row, and a plan deleted
  // while an org still points at it is a foreign key the teardown would report instead of
  // whatever the suite actually found.
  await service.from("plans").delete().eq("id", planId);
});

describe("createTender", () => {
  it("records the client, the three dates and the Items in one go", async () => {
    const tenderId = await aTender({
      expectedDecisionDate: "2026-09-15",
      notes: "Repeat client; they always ask for a sample.",
      items: [
        { productName: "Nitrile gloves", description: "Powder-free", quantity: 500, unit: "box of 50" },
        { productName: "Surgical masks", description: null, quantity: 20000, unit: "piece" },
      ],
    });

    const tender = await getTender(tenderId, await signedInAs(owner.email));

    expect(tender).toMatchObject({
      clientName: "Bangkok General Hospital",
      title: "Surgical consumables Q3",
      dateReceived: "2026-08-01",
      internalQuoteDeadline: "2026-08-20",
      clientSubmissionDeadline: "2026-08-28",
      expectedDecisionDate: "2026-09-15",
      notes: "Repeat client; they always ask for a sample.",
      ownerUserId: owner.id,
    });

    expect(tender?.items.map((item) => item.productName)).toEqual([
      "Nitrile gloves",
      "Surgical masks",
    ]);
  });

  it("hands out a reference from the org's sequence", async () => {
    const first = await createTender(tenderInput(), await signedInAs(owner.email));

    if (!first.ok) throw new Error(first.reason);
    created.push(first.tenderId);

    const second = await createTender(tenderInput(), await signedInAs(owner.email));

    if (!second.ok) throw new Error(second.reason);
    created.push(second.tenderId);

    expect(first.reference).toMatch(/^T-\d+$/);
    expect(Number(second.reference.slice(2))).toBe(Number(first.reference.slice(2)) + 1);
  });

  it("refuses a Tender with no Items, because a Tender always asks for something", async () => {
    const result = await createTender(
      tenderInput({ items: [] }),
      await signedInAs(owner.email),
    );

    expect(result).toEqual({ ok: false, reason: "no_items" });
  });

  it("refuses an Item with no quantity", async () => {
    const result = await createTender(
      tenderInput({
        items: [{ productName: "Gloves", description: null, quantity: 0, unit: "box" }],
      }),
      await signedInAs(owner.email),
    );

    expect(result).toEqual({ ok: false, reason: "invalid_quantity" });
  });

  it("refuses an Internal Quote Deadline that falls after the Client Submission Deadline", async () => {
    // The internal one exists so the team can pick what to Bid. Behind the submission
    // deadline it chases nobody, and the Tender looks healthy while it is already lost.
    const result = await createTender(
      tenderInput({
        internalQuoteDeadline: "2026-08-29",
        clientSubmissionDeadline: "2026-08-28",
      }),
      await signedInAs(owner.email),
    );

    expect(result).toEqual({ ok: false, reason: "deadlines_out_of_order" });
  });

  it("refuses a blank client name or title", async () => {
    const store = await signedInAs(owner.email);

    await expect(createTender(tenderInput({ clientName: "  " }), store)).resolves.toEqual({
      ok: false,
      reason: "incomplete",
    });
    await expect(createTender(tenderInput({ title: "" }), store)).resolves.toEqual({
      ok: false,
      reason: "incomplete",
    });
  });

  it("refuses a Disabled Owner", async () => {
    await service
      .from("memberships")
      .update({ disabled_at: disabledAt })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);

    const result = await createTender(
      tenderInput({ ownerUserId: mate.id }),
      await signedInAs(owner.email),
    );

    // Not `not_found`: on /tenders/new there is no Tender yet, so "that tender is no
    // longer there" is a sentence about something that never existed. What is wrong is
    // the person.
    expect(result).toEqual({ ok: false, reason: "unassignable" });

    await service
      .from("memberships")
      .update({ disabled_at: null })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);
  });

  it("refuses an Owner from another org", async () => {
    const result = await createTender(
      tenderInput({ ownerUserId: outsider.id }),
      await signedInAs(owner.email),
    );

    expect(result).toEqual({ ok: false, reason: "unassignable" });
  });

  it("refuses a caller with no session", async () => {
    const result = await createTender(tenderInput(), memoryCookieStore());

    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("creates nothing when it refuses", async () => {
    const before = await listTenders(await signedInAs(owner.email));

    await createTender(tenderInput({ items: [] }), await signedInAs(owner.email));

    const after = await listTenders(await signedInAs(owner.email));

    expect(after).toHaveLength(before.length);
  });
});

describe("updateTender", () => {
  it("edits the Tender after creation", async () => {
    const tenderId = await aTender();

    const result = await updateTender(
      {
        tenderId,
        clientName: "Chiang Mai Ram Hospital",
        title: "Surgical consumables Q4",
        dateReceived: "2026-08-02",
        internalQuoteDeadline: "2026-08-21",
        clientSubmissionDeadline: "2026-08-29",
        expectedDecisionDate: null,
        ownerUserId: mate.id,
        notes: "Handed over.",
      },
      runInstant,
      await signedInAs(owner.email),
    );

    expect(result).toEqual({ ok: true });

    const tender = await getTender(tenderId, await signedInAs(owner.email));

    expect(tender).toMatchObject({
      clientName: "Chiang Mai Ram Hospital",
      title: "Surgical consumables Q4",
      ownerUserId: mate.id,
      notes: "Handed over.",
    });
  });

  it("still edits a Tender whose Owner has since been Disabled", async () => {
    // Someone leaving is exactly when their Tenders get opened, and reassigning the
    // Owner cannot be the price of fixing a date on one. An Owner who is not being
    // changed is not being assigned to anybody.
    const tenderId = await aTender({ ownerUserId: mate.id });
    const store = await signedInAs(owner.email);

    await service
      .from("memberships")
      .update({ disabled_at: disabledAt })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);

    const result = await updateTender(
      {
        tenderId,
        clientName: "Bangkok General Hospital",
        title: "Surgical consumables Q3 — revised",
        dateReceived: "2026-08-01",
        internalQuoteDeadline: "2026-08-20",
        clientSubmissionDeadline: "2026-08-28",
        expectedDecisionDate: null,
        ownerUserId: mate.id,
        notes: null,
      },
      runInstant,
      store,
    );

    expect(result).toEqual({ ok: true });

    await service
      .from("memberships")
      .update({ disabled_at: null })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);
  });

  it("still refuses to hand a Tender to a Disabled colleague", async () => {
    // The mirror of the test above: leaving the Owner alone is fine, making somebody
    // who reads nothing the new Owner is not.
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);

    await service
      .from("memberships")
      .update({ disabled_at: disabledAt })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);

    const result = await updateTender(
      {
        tenderId,
        clientName: "Bangkok General Hospital",
        title: "Surgical consumables Q3",
        dateReceived: "2026-08-01",
        internalQuoteDeadline: "2026-08-20",
        clientSubmissionDeadline: "2026-08-28",
        expectedDecisionDate: null,
        ownerUserId: mate.id,
        notes: null,
      },
      runInstant,
      store,
    );

    expect(result).toEqual({ ok: false, reason: "unassignable" });

    await service
      .from("memberships")
      .update({ disabled_at: null })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);
  });

  it("refuses a Tender in another org", async () => {
    const tenderId = await aTender();

    const result = await updateTender(
      {
        tenderId,
        clientName: "Reached in",
        title: "Reached in",
        dateReceived: "2026-08-01",
        internalQuoteDeadline: "2026-08-20",
        clientSubmissionDeadline: "2026-08-28",
        expectedDecisionDate: null,
        ownerUserId: outsider.id,
        notes: null,
      },
      runInstant,
      await signedInAs(outsider.email),
    );

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("Tender Items", () => {
  const threeItems = [
    { productName: "Nitrile gloves", description: null, quantity: 500, unit: "box of 50" },
    { productName: "Surgical masks", description: null, quantity: 20000, unit: "piece" },
    { productName: "Isolation gowns", description: null, quantity: 800, unit: "piece" },
  ];

  it("keeps the Items in the order they were entered", async () => {
    const tenderId = await aTender({ items: threeItems });
    const store = await signedInAs(owner.email);

    const items = (await getTender(tenderId, store))?.items ?? [];

    expect(items.map((item) => item.productName)).toEqual([
      "Nitrile gloves",
      "Surgical masks",
      "Isolation gowns",
    ]);
  });

  it("keeps that order after one of them is edited", async () => {
    // Every Item of a new Tender is inserted in one statement, so `now()` gives them all
    // the same `created_at` to the microsecond. Ordering on it has no tiebreak and falls
    // through to whatever order the heap hands back — and an updated row is rewritten at
    // the end of it. The list a user typed then silently reshuffles on the way back from
    // fixing a typo in one line.
    const tenderId = await aTender({ items: threeItems });
    const store = await signedInAs(owner.email);
    const [first] = (await getTender(tenderId, store))?.items ?? [];

    await updateTenderItem(
      {
        itemId: first.id,
        productName: "Nitrile gloves, powder-free",
        description: null,
        quantity: 500,
        unit: "box of 50",
      },
      store,
    );

    const items = (await getTender(tenderId, store))?.items ?? [];

    expect(items.map((item) => item.productName)).toEqual([
      "Nitrile gloves, powder-free",
      "Surgical masks",
      "Isolation gowns",
    ]);
  });

  it("puts an Item added later at the end", async () => {
    const tenderId = await aTender({ items: threeItems });
    const store = await signedInAs(owner.email);

    await addTenderItem(
      {
        tenderId,
        productName: "Face shields",
        description: null,
        quantity: 300,
        unit: "piece",
      },
      store,
    );

    const items = (await getTender(tenderId, store))?.items ?? [];

    expect(items.map((item) => item.productName)).toEqual([
      "Nitrile gloves",
      "Surgical masks",
      "Isolation gowns",
      "Face shields",
    ]);
  });

  it("adds another Item to an existing Tender", async () => {
    const tenderId = await aTender();
    const store = await signedInAs(mate.email);

    const result = await addTenderItem(
      {
        tenderId,
        productName: "Surgical masks",
        description: null,
        quantity: 20000,
        unit: "piece",
      },
      store,
    );

    expect(result.ok).toBe(true);

    const tender = await getTender(tenderId, store);

    expect(tender?.items).toHaveLength(2);
  });

  it("edits an Item", async () => {
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);
    const [item] = (await getTender(tenderId, store))?.items ?? [];

    const result = await updateTenderItem(
      {
        itemId: item.id,
        productName: "Nitrile gloves, large",
        description: "Powder-free",
        quantity: 750,
        unit: "box of 100",
      },
      store,
    );

    expect(result).toEqual({ ok: true });

    const [edited] = (await getTender(tenderId, store))?.items ?? [];

    expect(edited).toMatchObject({
      productName: "Nitrile gloves, large",
      description: "Powder-free",
      quantity: 750,
      unit: "box of 100",
    });
  });

  it("refuses a quantity of zero on an edit as well as on creation", async () => {
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);
    const [item] = (await getTender(tenderId, store))?.items ?? [];

    const result = await updateTenderItem(
      { itemId: item.id, productName: "Gloves", description: null, quantity: -1, unit: "box" },
      store,
    );

    expect(result).toEqual({ ok: false, reason: "invalid_quantity" });
  });

  it("refuses a caller with no session, like every other write here", async () => {
    const tenderId = await aTender();
    const [item] = (await getTender(tenderId, await signedInAs(owner.email)))?.items ?? [];

    expect(await removeTenderItem(item.id, memoryCookieStore())).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("removes an Item, but never the last one", async () => {
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);

    await addTenderItem(
      { tenderId, productName: "Masks", description: null, quantity: 10, unit: "piece" },
      store,
    );

    const items = (await getTender(tenderId, store))?.items ?? [];

    expect(await removeTenderItem(items[1].id, store)).toEqual({ ok: true });
    expect(await removeTenderItem(items[0].id, store)).toEqual({
      ok: false,
      reason: "last_item",
    });

    expect((await getTender(tenderId, store))?.items).toHaveLength(1);
  });
});

describe("byNameThenId", () => {
  // The order Assignees are read in, tested as a rule rather than through the read.
  //
  // The read cannot answer for it: `tender_item_assignees` is keyed
  // `(tender_item_id, user_id)`, so an untiebroken embed comes back ascending by
  // `user_id` or in heap order depending on the plan Postgres picks, and the two are the
  // same answer often enough that a database test with the `id` key removed went green
  // 11 times in 25 (#105). That is a check reporting on the planner, not on the
  // ordering. Here the failing case is two lines long and it fails every time.
  const somchai = { id: "22222222-0000-0000-0000-000000000000", name: "Somchai Wong" };
  const alsoSomchai = { id: "11111111-0000-0000-0000-000000000000", name: "Somchai Wong" };

  it("puts two colleagues who share a name in a fixed order rather than an arbitrary one", () => {
    expect([somchai, alsoSomchai].sort(byNameThenId)).toEqual([alsoSomchai, somchai]);
  });

  it("still lets the name decide whenever it can", () => {
    // `id` is the last resort, never the key: Anong sorts first on her name despite the
    // higher id, or the picker would be ordered by something nobody can see.
    const anong = { id: "99999999-0000-0000-0000-000000000000", name: "Anong Srisai" };

    expect([somchai, anong].sort(byNameThenId)).toEqual([anong, somchai]);
  });
});

describe("Assignees", () => {
  it("lets the Owner add and remove someone on an Item", async () => {
    const tenderId = await aTender();
    const tenderItemId = await anItemOf(tenderId);
    const store = await signedInAs(owner.email);

    expect(await addAssignee({ tenderItemId, userId: mate.id }, store)).toEqual({
      ok: true,
    });
    expect(
      (await getTender(tenderId, store))?.items[0].assignees.map((a) => a.id),
    ).toEqual([mate.id]);

    expect(await removeAssignee({ tenderItemId, userId: mate.id }, store)).toEqual({
      ok: true,
    });
    expect((await getTender(tenderId, store))?.items[0].assignees).toEqual([]);
  });

  it("lets anyone add themselves to an Item without waiting to be asked", async () => {
    // Self-assignment is the step that enrols you in the Item's reminders, and it is
    // deliberately not gated: ADR-0004's rule, per Item since ADR-0033.
    const tenderId = await aTender();
    const tenderItemId = await anItemOf(tenderId);
    const store = await signedInAs(mate.email);

    expect(await addAssignee({ tenderItemId, userId: mate.id }, store)).toEqual({
      ok: true,
    });
  });

  it("refuses a non-Owner adding somebody else", async () => {
    const tenderItemId = await anItemOf(await aTender());

    const result = await addAssignee(
      { tenderItemId, userId: owner.id },
      await signedInAs(mate.email),
    );

    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("refuses a non-Owner removing somebody else", async () => {
    const tenderItemId = await anItemOf(await aTender());

    await addAssignee({ tenderItemId, userId: owner.id }, await signedInAs(owner.email));

    const result = await removeAssignee(
      { tenderItemId, userId: owner.id },
      await signedInAs(mate.email),
    );

    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("lets an Assignee take themselves back off", async () => {
    const tenderItemId = await anItemOf(await aTender());
    const store = await signedInAs(mate.email);

    await addAssignee({ tenderItemId, userId: mate.id }, store);

    expect(await removeAssignee({ tenderItemId, userId: mate.id }, store)).toEqual({
      ok: true,
    });
  });

  it("is idempotent, so a second add is not an error", async () => {
    const tenderId = await aTender();
    const tenderItemId = await anItemOf(tenderId);
    const store = await signedInAs(mate.email);

    await addAssignee({ tenderItemId, userId: mate.id }, store);

    expect(await addAssignee({ tenderItemId, userId: mate.id }, store)).toEqual({
      ok: true,
    });
    expect((await getTender(tenderId, store))?.items[0].assignees).toHaveLength(1);
  });

  it("scopes assignment to the one Item, not the Tender", async () => {
    // The whole of ADR-0033 in one read: being put on one Item of a two-Item Tender
    // says nothing about the other, which is what makes dividing expressible at all.
    const tenderId = await aTender({
      items: [
        { productName: "Nitrile gloves", description: null, quantity: 500, unit: "box of 50" },
        { productName: "Surgical masks", description: null, quantity: 20000, unit: "piece" },
      ],
    });
    const store = await signedInAs(owner.email);
    const tender = await getTender(tenderId, store);

    await addAssignee({ tenderItemId: tender!.items[0].id, userId: mate.id }, store);

    const after = await getTender(tenderId, store);

    expect(after?.items[0].assignees.map((a) => a.id)).toEqual([mate.id]);
    expect(after?.items[1].assignees).toEqual([]);
  });

  it("refuses to assign a Disabled colleague, whose id the picker never offered", async () => {
    // The picker leaves them out, and the picker is not the gate: the action is a public
    // endpoint and the disabled member's row is still visible to the rest of the org.
    const tenderItemId = await anItemOf(await aTender());

    await service
      .from("memberships")
      .update({ disabled_at: disabledAt })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);

    const result = await addAssignee(
      { tenderItemId, userId: mate.id },
      await signedInAs(owner.email),
    );

    expect(result).toEqual({ ok: false, reason: "unassignable" });

    await service
      .from("memberships")
      .update({ disabled_at: null })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);
  });

  it("still lets the Owner take a Disabled colleague off", async () => {
    // The mirror has to keep working. Someone leaving is exactly when their Items get
    // tidied up, and by then their account is already disabled.
    const tenderItemId = await anItemOf(await aTender());
    const store = await signedInAs(owner.email);

    await addAssignee({ tenderItemId, userId: mate.id }, store);

    await service
      .from("memberships")
      .update({ disabled_at: disabledAt })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);

    expect(await removeAssignee({ tenderItemId, userId: mate.id }, store)).toEqual({
      ok: true,
    });

    await service
      .from("memberships")
      .update({ disabled_at: null })
      .eq("user_id", mate.id)
      .eq("org_id", orgId);
  });

  it("refuses to assign someone from another org", async () => {
    const tenderItemId = await anItemOf(await aTender());

    const result = await addAssignee(
      { tenderItemId, userId: outsider.id },
      await signedInAs(owner.email),
    );

    expect(result).toEqual({ ok: false, reason: "unassignable" });
  });

  it("refuses an Item in another org, as not found rather than as forbidden", async () => {
    // RLS makes somebody else's Item and no Item the same answer, and that is the
    // answer to give: `not_found` states nothing about what exists elsewhere.
    const result = await createTender(
      tenderInput({ ownerUserId: outsider.id }),
      await signedInAs(outsider.email),
    );

    if (!result.ok) throw new Error(result.reason);
    created.push(result.tenderId);

    const tenderItemId = await anItemOf(result.tenderId);

    expect(
      await addAssignee({ tenderItemId, userId: owner.id }, await signedInAs(owner.email)),
    ).toEqual({ ok: false, reason: "not_found" });
  });
});

/**
 * These ask the database directly, with the service client, because the point is that
 * the guarantee does not depend on the application remembering it. `createTender` never
 * sends a reference — that is exactly why a test that goes through it proves nothing.
 */
describe("the reference is the database's to issue", () => {
  it("overwrites a reference the caller supplied", async () => {
    const { data, error } = await service
      .from("tenders")
      .insert({
        org_id: orgId,
        reference: "T-9999",
        client_name: "Direct",
        title: "Direct",
        date_received: "2026-08-01",
        internal_quote_deadline: "2026-08-20",
        client_submission_deadline: "2026-08-28",
        owner_user_id: owner.id,
      })
      .select("id, reference")
      .single();

    if (error) throw error;

    created.push(data.id);

    expect(data.reference).toMatch(/^T-\d+$/);
    expect(data.reference).not.toBe("T-9999");
  });

  it("pins the reference against an update, and touches updated_at", async () => {
    const tenderId = await aTender();

    const { data: before } = await service
      .from("tenders")
      .select("reference, updated_at")
      .eq("id", tenderId)
      .single();

    const { data: after, error } = await service
      .from("tenders")
      .update({ reference: "T-9999", title: "Renamed" })
      .eq("id", tenderId)
      .select("reference, title, updated_at")
      .single();

    if (error) throw error;

    expect(after.reference).toBe(before?.reference);
    expect(after.title).toBe("Renamed");
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before!.updated_at).getTime(),
    );
  });
});

describe("listTenders and getTender", () => {
  it("lists the org's Tenders with what a list row needs", async () => {
    const tenderId = await aTender();

    const rows = await listTenders(await signedInAs(mate.email));
    const row = rows.find((candidate) => candidate.id === tenderId);

    expect(row).toMatchObject({
      clientName: "Bangkok General Hospital",
      title: "Surgical consumables Q3",
      clientSubmissionDeadline: "2026-08-28",
      ownerName: owner.email,
      // The Items ride along with their Outcomes: Progress and both overdue conditions
      // are readings of all of them, and a per-Tender fetch would make the derivation
      // depend on how many round trips the caller made.
      items: [{ outcome: null }],
    });
    expect(row?.reference).toMatch(/^T-\d+$/);
  });

  it("hands the Assignees back on the Item, and an Item with none says so", async () => {
    const tenderId = await aTender({
      items: [
        { productName: "Nitrile gloves", description: null, quantity: 500, unit: "box of 50" },
        { productName: "Surgical masks", description: null, quantity: 20000, unit: "piece" },
      ],
    });
    const store = await signedInAs(owner.email);
    const before = await getTender(tenderId, store);

    await addAssignee({ tenderItemId: before!.items[0].id, userId: mate.id }, store);

    const tender = await getTender(tenderId, store);

    expect(tender?.items[0].assignees).toEqual([{ id: mate.id, name: mate.email }]);
    // Nobody Sourcing is this empty array and nothing else — derived, never stored.
    expect(tender?.items[1].assignees).toEqual([]);
  });

  it("keeps the two-Assignee order the rule byNameThenId states", async () => {
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);
    const tenderItemId = await anItemOf(tenderId);

    await addAssignee({ tenderItemId, userId: owner.id }, store);
    await addAssignee({ tenderItemId, userId: mate.id }, store);

    const assignees = (await getTender(tenderId, store))!.items[0].assignees;

    expect(assignees).toHaveLength(2);
    expect(assignees).toEqual([...assignees].sort(byNameThenId));
  });

  it("unions the Items' Assignees into the row's assigneeUserIds", async () => {
    // The Tender-level list is what Mine reads, and holding any one Item keeps the
    // Tender yours — so one person on both Items appears once, not twice.
    const tenderId = await aTender({
      items: [
        { productName: "Nitrile gloves", description: null, quantity: 500, unit: "box of 50" },
        { productName: "Surgical masks", description: null, quantity: 20000, unit: "piece" },
      ],
    });
    const store = await signedInAs(owner.email);
    const tender = await getTender(tenderId, store);

    await addAssignee({ tenderItemId: tender!.items[0].id, userId: mate.id }, store);
    await addAssignee({ tenderItemId: tender!.items[0].id, userId: owner.id }, store);
    await addAssignee({ tenderItemId: tender!.items[1].id, userId: owner.id }, store);

    const row = (await listTenders(store)).find((candidate) => candidate.id === tenderId);

    expect(row?.assigneeUserIds.toSorted()).toEqual([mate.id, owner.id].toSorted());
  });

  it("shows another org nothing", async () => {
    const tenderId = await aTender();
    const store = await signedInAs(outsider.email);

    expect((await listTenders(store)).map((row) => row.id)).not.toContain(tenderId);
    expect(await getTender(tenderId, store)).toBeNull();
  });

  it("shows a signed-out caller nothing", async () => {
    const tenderId = await aTender();

    expect(await listTenders(memoryCookieStore())).toEqual([]);
    expect(await getTender(tenderId, memoryCookieStore())).toBeNull();
  });
});

describe("recording what happened", () => {
  // Literals, not `new Date()`: the clock is resolved at the request boundary and passed
  // down (ADR-0010), and these are the two instants the tests below assert were stored.
  const submittedAt = new Date("2026-08-27T09:15:00.000Z");
  const decidedAt = new Date("2026-09-10T04:00:00.000Z");

  /** A Tender asking for two products, which is what a split award needs. */
  async function aSplitTender(): Promise<string> {
    return aTender({
      items: [
        { productName: "Nitrile gloves", description: null, quantity: 500, unit: "box of 50" },
        { productName: "PICC catheter 4Fr", description: null, quantity: 40, unit: "piece" },
      ],
    });
  }

  async function itemsOf(tenderId: string) {
    const tender = await getTender(tenderId, await signedInAs(owner.email));

    if (!tender) throw new Error("the Tender went missing");

    return tender.items;
  }

  it("records that the Bid went out", async () => {
    const tenderId = await aTender();

    expect(await recordSubmission({ tenderId, submittedAt }, await signedInAs(owner.email))).toEqual(
      { ok: true },
    );

    const tender = await getTender(tenderId, await signedInAs(mate.email));

    expect(tender?.submittedAt).not.toBeNull();
    expect(new Date(tender!.submittedAt!).toISOString()).toBe(submittedAt.toISOString());
  });

  it("takes the submission back off, because it can be recorded in error", async () => {
    // The undo matters more here than almost anywhere: `submitted_at` is what tells
    // "submitted on time" from "never submitted", so a wrong one hides the one failure
    // the product exists to prevent.
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);

    await recordSubmission({ tenderId, submittedAt }, store);

    expect(await recordSubmission({ tenderId, submittedAt: null }, store)).toEqual({ ok: true });
    expect((await getTender(tenderId, store))?.submittedAt).toBeNull();
  });

  it("refuses a submission on a Tender the caller cannot see", async () => {
    const tenderId = await aTender();

    expect(
      await recordSubmission({ tenderId, submittedAt }, await signedInAs(outsider.email)),
    ).toEqual({ ok: false, reason: "not_found" });

    expect(await recordSubmission({ tenderId, submittedAt }, memoryCookieStore())).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("records an Outcome per Item, with the day it was decided", async () => {
    const tenderId = await aSplitTender();
    const store = await signedInAs(owner.email);
    const [gloves, catheter] = await itemsOf(tenderId);

    expect(
      await setItemOutcome({ itemId: gloves.id, outcome: "won", decidedAt }, store),
    ).toEqual({ ok: true });
    expect(
      await setItemOutcome({ itemId: catheter.id, outcome: "lost", decidedAt }, store),
    ).toEqual({ ok: true });

    const items = await itemsOf(tenderId);

    expect(items.map((item) => item.outcome)).toEqual(["won", "lost"]);
    expect(new Date(items[0].outcomeAt!).toISOString()).toBe(decidedAt.toISOString());
  });

  it("derives the Tender's Outcome from the Items as stored", async () => {
    // The three rules are tested as arithmetic next door. What this proves is that the
    // rows they are read from come back in the shape the rules take — a split award,
    // through the database and back.
    const tenderId = await aSplitTender();
    const store = await signedInAs(owner.email);
    const [gloves, catheter] = await itemsOf(tenderId);

    expect(tenderOutcome(await itemsOf(tenderId))).toBeNull();

    await setItemOutcome({ itemId: gloves.id, outcome: "won", decidedAt }, store);

    // One Item still undecided, so the Tender is still open. Rule 1.
    expect(tenderOutcome(await itemsOf(tenderId))).toBeNull();

    await setItemOutcome({ itemId: catheter.id, outcome: "lost", decidedAt }, store);

    expect(tenderOutcome(await itemsOf(tenderId))).toBe("partial");
  });

  it("does not re-date an Outcome that has not changed", async () => {
    // `outcome_at` is what "won this month" is counted on, so a save that decides nothing
    // must not move it. Reachable from the screen: the picker's no-JavaScript Save button
    // posts whatever is selected, changed or not.
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);
    const [item] = await itemsOf(tenderId);

    await setItemOutcome({ itemId: item.id, outcome: "won", decidedAt }, store);

    const laterStill = new Date("2026-10-01T04:00:00.000Z");

    expect(
      await setItemOutcome({ itemId: item.id, outcome: "won", decidedAt: laterStill }, store),
    ).toEqual({ ok: true });

    const [again] = await itemsOf(tenderId);

    expect(new Date(again.outcomeAt!).toISOString()).toBe(decidedAt.toISOString());
  });

  it("takes an Outcome back off, clearing the date with it", async () => {
    const tenderId = await aTender();
    const store = await signedInAs(owner.email);
    const [item] = await itemsOf(tenderId);

    await setItemOutcome({ itemId: item.id, outcome: "won", decidedAt }, store);

    expect(await setItemOutcome({ itemId: item.id, outcome: null, decidedAt }, store)).toEqual({
      ok: true,
    });

    // Both, or the `outcome_dated` CHECK would have refused the write outright.
    expect(await itemsOf(tenderId)).toMatchObject([{ outcome: null, outcomeAt: null }]);
  });

  it("never writes `partial` to a row", async () => {
    // `partial` is a Tender-level display state derived from the Items (ADR-0001). It is
    // refused here rather than reaching the CHECK that would also refuse it, so the
    // person posting it gets a sentence instead of a failed save — and the row is
    // untouched either way.
    const tenderId = await aSplitTender();
    const store = await signedInAs(owner.email);
    const [gloves, catheter] = await itemsOf(tenderId);

    await setItemOutcome({ itemId: gloves.id, outcome: "won", decidedAt }, store);
    await setItemOutcome({ itemId: catheter.id, outcome: "lost", decidedAt }, store);

    // The Tender reads as `partial`, and no Item may be made to say so.
    expect(tenderOutcome(await itemsOf(tenderId))).toBe("partial");

    for (const item of [gloves, catheter]) {
      expect(
        await setItemOutcome(
          // Only reachable by hand-posting one: the picker offers the four stored values.
          { itemId: item.id, outcome: "partial", decidedAt },
          store,
        ),
      ).toEqual({ ok: false, reason: "invalid_outcome" });
    }

    expect((await itemsOf(tenderId)).map((item) => item.outcome)).toEqual(["won", "lost"]);

    // And nowhere else in the database either, which the CHECK is what guarantees.
    const { data } = await service.from("tender_items").select("id").eq("outcome", "partial");

    expect(data).toEqual([]);
  });

  it("refuses an Outcome on an Item the caller cannot see", async () => {
    const tenderId = await aTender();
    const [item] = await itemsOf(tenderId);

    expect(
      await setItemOutcome(
        { itemId: item.id, outcome: "won", decidedAt },
        await signedInAs(outsider.email),
      ),
    ).toEqual({ ok: false, reason: "not_found" });

    expect(
      await setItemOutcome({ itemId: item.id, outcome: "won", decidedAt }, memoryCookieStore()),
    ).toEqual({ ok: false, reason: "forbidden" });
  });
});

/**
 * The plan's cap on open Tenders, at the two points that can cross it (ADR-0040).
 *
 * Both are *additions*, and that is the only thing the cap has an opinion about:
 * creating a Tender, and clearing the Outcome that was keeping a decided one closed.
 * Everything else here — recording an Outcome, editing a Tender the org already holds,
 * reading any of them — stays available however far over the line the organisation is,
 * because a cap refuses the next act and never takes anything away.
 *
 * Staged against a real plan row and the real count, rather than against a stub: the
 * arithmetic is checked next door in `plan.test.ts`, so what is worth the database here
 * is the half that cannot be checked anywhere else — that "open" means to the cap
 * exactly what it means to the Tender list, derived from the Items and stored nowhere.
 */
describe("the plan's cap on open Tenders", () => {
  const decidedAt = new Date("2026-09-10T04:00:00.000Z");

  async function itemsOf(tenderId: string) {
    const tender = await getTender(tenderId, await signedInAs(owner.email));

    if (!tender) throw new Error("the Tender went missing");

    return tender.items;
  }

  /** Back to uncapped, so nothing here reaches the rest of the file. */
  afterEach(async () => {
    await capOpenTendersAt(null);
  });

  it("lets the org open its one Tender and refuses the second", async () => {
    await capOpenTendersAt(1);
    await aTender();

    const second = await createTender(tenderInput(), await signedInAs(owner.email));

    expect(second).toEqual({ ok: false, reason: "plan_limit" });
  });

  it("writes no Tender when it refuses, so the reference counter does not move", async () => {
    // The cap is asked before the insert rather than rolled back after it. A reference
    // issued to a Tender that was never created is a gap in the org's own numbering, and
    // the counter has no way back.
    await capOpenTendersAt(1);
    await aTender();

    await createTender(tenderInput(), await signedInAs(owner.email));

    const { count } = await service
      .from("tenders")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    expect(count).toBe(1);
  });

  it("lets the next one open once an Outcome has closed the last", async () => {
    // The whole promise of a cap on *open* Tenders: the way back under the line is to
    // finish the work, and it takes effect on the next act rather than on the next bill.
    await capOpenTendersAt(1);

    const first = await aTender();
    const store = await signedInAs(owner.email);
    const [item] = await itemsOf(first);

    expect(await setItemOutcome({ itemId: item.id, outcome: "won", decidedAt }, store)).toEqual({
      ok: true,
    });

    const second = await createTender(tenderInput(), store);

    expect(second.ok).toBe(true);

    if (second.ok) created.push(second.tenderId);
  });

  it("refuses to reopen a decided Tender while the org is at its cap", async () => {
    // Taking the Outcome back off would make two Tenders open on a plan that allows one,
    // so it is an addition and is refused as one — the cap would otherwise be a rule
    // anybody could step around by deciding a Tender and undeciding it.
    await capOpenTendersAt(1);

    const first = await aTender();
    const store = await signedInAs(owner.email);
    const [item] = await itemsOf(first);

    await setItemOutcome({ itemId: item.id, outcome: "won", decidedAt }, store);

    const second = await createTender(tenderInput(), store);

    if (!second.ok) throw new Error(second.reason);
    created.push(second.tenderId);

    expect(
      await setItemOutcome({ itemId: item.id, outcome: null, decidedAt }, store),
    ).toEqual({ ok: false, reason: "plan_limit" });

    // And the Outcome is still there. A refusal changes nothing.
    expect((await itemsOf(first))[0].outcome).toBe("won");
  });

  it("still lets an Outcome be corrected on a Tender that is already open", async () => {
    // Clearing an Item on a Tender with another Item still undecided adds nothing: the
    // Tender was open before and is open after, and it is already counted. An org sitting
    // on its cap has to stay able to fix a mistake it made on the work it is doing.
    await capOpenTendersAt(1);

    const tenderId = await aTender({
      items: [
        { productName: "Nitrile gloves", description: null, quantity: 500, unit: "box of 50" },
        { productName: "PICC catheter 4Fr", description: null, quantity: 40, unit: "piece" },
      ],
    });
    const store = await signedInAs(owner.email);
    const [gloves] = await itemsOf(tenderId);

    await setItemOutcome({ itemId: gloves.id, outcome: "won", decidedAt }, store);

    expect(
      await setItemOutcome({ itemId: gloves.id, outcome: null, decidedAt }, store),
    ).toEqual({ ok: true });
  });

  it("refuses nothing at all on a plan with no cap", async () => {
    // Null is how the row says uncapped, and there is no other way to say it. Three
    // Tenders because two could be a cap of two.
    const store = await signedInAs(owner.email);

    for (let i = 0; i < 3; i += 1) {
      const result = await createTender(tenderInput(), store);

      expect(result.ok).toBe(true);

      if (result.ok) created.push(result.tenderId);
    }
  });
});
