import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "@/messages/en.json";
import { refused, submittedItems } from "@/lib/tenders/tender-form";
import type { TenderItem } from "@/lib/tenders/tenders";

import { EditTenderItemForm } from "./tender-item-forms";

/**
 * **Which Item is open, and why it is not remembered** — the half of the edit screen's
 * Item folds that only exists once the forms are interactive.
 *
 * Openness here is derived on every render and never stored, which is a claim about what
 * happens *after* a submit comes back rather than about what is drawn first: a refused
 * save has to bring its own Item back open with the typing still in it, and a successful
 * one has to leave a fold the reader opened by hand exactly as they left it. Neither is
 * visible from the server, and neither is visible from the markup either — both are
 * consequences of React writing `open` only when its own value for it changes.
 *
 * The action is the seam's edge and is stubbed; what a refusal *means* is asserted over
 * fixtures in `@/lib/tenders`. Openness is read off the `<details>` element rather than
 * off what is visible, because jsdom has no layout and draws a shut disclosure's contents
 * as plainly as an open one — the property is the thing the browser acts on, and the
 * thing the guards in the `layout` project stop at.
 */

type ItemAction = (previous: unknown, formData: FormData) => Promise<object>;

const posted = {
  update: vi.fn<ItemAction>(async () => ({})),
  remove: vi.fn<ItemAction>(async () => ({})),
};

vi.mock("@/app/actions/tenders", () => ({
  addTenderItemAction: (previous: unknown, formData: FormData) =>
    posted.update(previous, formData),
  updateTenderItemAction: (previous: unknown, formData: FormData) =>
    posted.update(previous, formData),
  removeTenderItemAction: (previous: unknown, formData: FormData) =>
    posted.remove(previous, formData),
  // The panel carries the Item's assignee controls now (ADR-0033); nothing in this
  // suite presses them, so the stubs only have to exist.
  addAssigneeAction: async () => ({}),
  removeAssigneeAction: async () => ({}),
}));

const somchai = { id: "user-somchai", name: "Somchai Prasertkul" };

const gloves: TenderItem = {
  id: "item-gloves",
  productName: "Nitrile examination gloves, powder-free",
  description: "Non-sterile",
  quantity: 40000,
  unit: "piece",
  outcome: null,
  outcomeAt: null,
  assignees: [somchai],
};

const masks: TenderItem = {
  id: "item-masks",
  productName: "Surgical face mask, three-ply",
  description: null,
  quantity: 2000,
  unit: "box of 50",
  outcome: null,
  outcomeAt: null,
  assignees: [],
};

/** The Items as the edit screen draws them: one form each, all of them removable. */
function drawn(items: TenderItem[], { only = false }: { only?: boolean } = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {items.map((item) => (
        <EditTenderItemForm
          key={item.id}
          tenderId="a-tender"
          item={item}
          members={[somchai]}
          callerId={somchai.id}
          isOwner
          removable={!only}
          // What the page derives: the one Item on a one-Item Tender opens, because a
          // fold over a list of one is a tap in front of the only thing there is to edit.
          defaultOpen={only}
        />
      ))}
    </NextIntlClientProvider>,
  );
}

/** The disclosure an Item's form is behind, found by the summary that names it. */
function foldFor(item: TenderItem): HTMLDetailsElement {
  const heading = screen.getByRole("heading", { name: item.productName, level: 3 });
  const fold = heading.closest("details");

  if (fold === null) throw new Error(`${item.productName} is not behind a disclosure.`);

  return fold;
}

/** Both buttons sit inside the disclosure's panel, beneath the form they post to. */
const buttonIn = (fold: HTMLDetailsElement, name: "Save" | "Remove") =>
  within(fold).getByRole("button", { name });

function productNameIn(fold: HTMLDetailsElement): HTMLInputElement {
  return within(fold).getByLabelText("Product");
}

describe("an existing Item's form", () => {
  // **`mockReset`, not `mockClear`.** Clearing keeps the implementation, so the refusal
  // one test installs would still be installed for the next — and the test that asserts a
  // *successful* save leaves a hand-opened fold alone would be asserting down the refusal
  // path instead, green for the wrong reason.
  beforeEach(() => {
    posted.update.mockReset();
    posted.update.mockImplementation(async () => ({}));
    posted.remove.mockReset();
    posted.remove.mockImplementation(async () => ({}));
  });

  it("is behind a disclosure summarised by the product name", () => {
    drawn([gloves, masks]);

    // Each form is *inside* the disclosure that names its Item, rather than beside a bar
    // that names it — the difference between a fold and a label — and the bars are not
    // crossed over: the form behind each one is holding that Item's own product name.
    for (const item of [gloves, masks]) {
      const fold = foldFor(item);

      expect(productNameIn(fold).closest("details")).toBe(fold);
      expect(productNameIn(fold).value).toBe(item.productName);
    }
  });

  it("is shut on arrival when the Tender has more than one Item", () => {
    drawn([gloves, masks]);

    expect(foldFor(gloves).open).toBe(false);
    expect(foldFor(masks).open).toBe(false);
  });

  it("is open when it is the Tender's only Item", () => {
    drawn([gloves], { only: true });

    expect(foldFor(gloves).open).toBe(true);
  });

  it("opens the Item a save was refused on, with the typing still in it", async () => {
    const user = userEvent.setup();

    posted.update.mockImplementation(async (_previous, formData) =>
      refused("invalid_quantity", { items: submittedItems(formData) }),
    );

    drawn([gloves, masks]);

    await user.clear(productNameIn(foldFor(masks)));
    await user.type(productNameIn(foldFor(masks)), "Surgical face mask, four-ply");
    await user.click(buttonIn(foldFor(masks), "Save"));

    await waitFor(() => expect(foldFor(masks).open).toBe(true));

    // The refusal came back with what was typed, and the form is holding it rather than
    // the Item as it is still saved.
    expect(productNameIn(foldFor(masks)).value).toBe("Surgical face mask, four-ply");

    // And nothing else opened: the refusal is about one Item.
    expect(foldFor(gloves).open).toBe(false);
  });

  it("leaves a fold the reader opened by hand open across a save that succeeds", async () => {
    const user = userEvent.setup();

    drawn([gloves, masks]);

    // What the browser does to a `<details>` when its summary is pressed, and the whole
    // of what the reader's opening it amounts to — no state of ours records it.
    foldFor(masks).open = true;

    await user.click(buttonIn(foldFor(masks), "Save"));

    await waitFor(() => expect(posted.update).toHaveBeenCalled());

    // Asked for again rather than held from before the submit: a disclosure that was
    // remounted across the save is a *different* element, and the one captured earlier
    // would still be reporting the openness it was detached with.
    expect(foldFor(masks).open).toBe(true);
    expect(foldFor(gloves).open).toBe(false);
  });

  it("opens the Item a remove was refused on, so the refusal is not behind a bar", async () => {
    const user = userEvent.setup();

    posted.remove.mockImplementation(async () => refused("last_item", {}));

    drawn([gloves, masks]);

    await user.click(buttonIn(foldFor(masks), "Remove"));

    await waitFor(() => expect(foldFor(masks).open).toBe(true));
  });
});
