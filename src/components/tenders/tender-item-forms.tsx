"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  addTenderItemAction,
  removeTenderItemAction,
  updateTenderItemAction,
  type TenderFormState,
} from "@/app/actions/tenders";
import { TenderItemInputs } from "@/components/tenders/tender-item-fields";
import { TenderProblemNotice } from "@/components/tenders/tender-problem";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { itemAsSubmitted } from "@/lib/tenders/tender-form";
import type { TenderItem } from "@/lib/tenders/tenders";

const initialState: TenderFormState = {};

/**
 * Whether the last submit came back refused.
 *
 * Either half is enough: a refusal always carries a reason, and the update paths also
 * carry the typing back so the inputs can be restored from it. Written once because both
 * forms below ask the question and an Item's own form asks it of two actions.
 */
function wasRefused(state: TenderFormState): boolean {
  return state.error !== undefined || state.submitted !== undefined;
}

/**
 * One existing Item, **behind a fold summarised by its product name**: open it, save its
 * edits, or take it off the Tender.
 *
 * **Why it folds at all** is ADR-0031: the act on this surface is correcting one thing
 * you already know is wrong, so three open forms put two forms nobody came for in front
 * of the one they did. The summary *adds* information rather than hiding it — three
 * identical unlabelled bordered boxes become three product names, which is how the
 * Reference Image gallery on this same screen already labels an Item.
 *
 * **The summary carries the product name and nothing else.** Not a completeness mark:
 * `updateTenderItem` gates this path as `addTenderItem` gates the other, so a saved Item
 * always has a name, a unit and a positive quantity and nothing half-finished can hide
 * behind a tidy bar. Not the quantity either — {@link Fold}'s count slot means *how many
 * things are in there*, and a quantity in it would read as the number of things behind
 * the fold.
 *
 * **Openness is derived on every render and never remembered**, the posture {@link Fold}
 * and `ItemDisclosure` already take. Two things derive it, and nothing else may: a submit
 * this Item's server refused, which brings it back open with what was typed still in it,
 * and `defaultOpen` for the case the page knows about and this component does not — a
 * Tender with one Item on it. A fold the reader opened by hand survives a save that
 * succeeds untouched, because React writes `open` only when its own value for it changes
 * and that value did not.
 *
 * **A refused *remove* opens it too**, which the save's refusal makes obvious only once
 * you notice the notice is inside the panel: the last Item on a Tender cannot go, and a
 * bar that stayed shut would swallow the sentence saying so.
 *
 * **Two forms, one row of buttons.** Saving an Item and removing it are separate server
 * actions and so are separate `<form>`s — a submit cannot post to two of them — but they
 * were also two stacked rows, 12px apart, with the destructive one directly under the
 * one pressed every time. They share a row now, Save at the leading edge and Remove at
 * the trailing one, which takes 56px off each Item card *and* puts the width of the card
 * between the two targets rather than a finger's width.
 *
 * `form={...}` is what makes that possible: a submit button may sit outside the form it
 * posts, addressed by id. Both forms therefore render their hidden fields and their
 * refusal notice and nothing else, and the buttons live below them in a row of their own.
 * The ids are built from the Item's, because this screen draws one of these per Item.
 */
export function EditTenderItemForm({
  tenderId,
  item,
  removable,
  defaultOpen = false,
}: {
  tenderId: string;
  item: TenderItem;
  removable: boolean;
  /**
   * **The one Item of a one-Item Tender**, which is the case the page can see and this
   * component cannot: a fold over a list of one is a bar with nothing to choose between,
   * and it puts a tap in front of the only editable thing on the screen. Derived from the
   * Item count rather than remembered, exactly as `removable` is derived from the same
   * count for the same reason.
   *
   * It is also the shared screen record's way in, for the reason
   * {@link AddTenderItemForm}'s own `defaultOpen` states in full. A refused submit opens
   * the fold regardless of it.
   */
  defaultOpen?: boolean;
}) {
  const t = useTranslations("tenders");
  const [state, formAction, isPending] = useActionState(
    updateTenderItemAction,
    initialState,
  );
  const [removeState, removeAction, isRemoving] = useActionState(
    removeTenderItemAction,
    initialState,
  );

  const saveId = `save-item-${item.id}`;
  const removeId = `remove-item-${item.id}`;

  // Either action having been refused. Both say so inside the panel, so both have to
  // open it — the sentence explaining that the last Item on a Tender cannot go is no use
  // behind a shut bar.
  const refused = wasRefused(state) || wasRefused(removeState);

  return (
    // No surface of its own: `Fold` already draws the card this form used to draw for
    // itself, and its panel already spends the padding.
    <Fold level={3} title={item.productName} defaultOpen={defaultOpen || refused}>
      <div className="flex flex-col gap-3">
        <form id={saveId} action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="tenderId" value={tenderId} />
          <input type="hidden" name="itemId" value={item.id} />

          <TenderProblemNotice error={state.error} />
          {/* What the last submit was refused for, if it was — otherwise the Item as it
              is saved. React restores the inputs from these on every submit. */}
          <TenderItemInputs
            domId={`item-${item.id}`}
            defaults={state.submitted?.items?.[0] ?? itemAsSubmitted(item)}
          />
        </form>

        {removable ? (
          <form id={removeId} action={removeAction}>
            <input type="hidden" name="tenderId" value={tenderId} />
            <input type="hidden" name="itemId" value={item.id} />

            {/* Above the buttons, which is where the refusal it explains was pressed. An
                empty notice draws nothing, so this form is 0px on the ordinary pass. */}
            <TenderProblemNotice error={removeState.error} />
          </form>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="submit"
            form={saveId}
            variant="outline"
            disabled={isPending}
            className="h-11"
          >
            {isPending ? t("form.saving") : t("form.save")}
          </Button>

          {removable ? (
            <Button
              type="submit"
              form={removeId}
              variant="destructive"
              disabled={isRemoving}
              className="h-11"
            >
              {isRemoving ? t("item.removing") : t("item.remove")}
            </Button>
          ) : null}
        </div>
      </div>
    </Fold>
  );
}

/**
 * A blank Item appended to a Tender that already exists — **shut until it is asked for.**
 *
 * Four empty inputs and a button is 422px, and it sat permanently at the foot of a screen
 * that was already 3629px of forms. Nobody arrives at the edit screen to look at a blank
 * Item; they arrive to change one that is there, and on the pass where they do want a new
 * one the fold's own summary is the button they would have scrolled to anyway. It is the
 * rule {@link Fold} was written for, applied to a form rather than to a block of facts.
 *
 * **A refused add reopens it**, which is the whole of the state handling here and needs
 * no more than the prop. React writes `open` only when its own value for it changes, so a
 * submit that comes back with a problem flips `false → true` and the panel returns with
 * what was typed still in it, while a fold the reader opened by hand stays open across a
 * successful add — React never wrote `open`, so it has nothing to undo.
 *
 * `level={3}`: the section above already spends the `<h2>` on *Tender items*.
 */
export function AddTenderItemForm({
  tenderId,
  defaultOpen = false,
}: {
  tenderId: string;
  /**
   * **The shared screen record's way in, and it is here because a shut `<details>` fails
   * `checkVisibility()`.** Every guard in the `layout` project walks what a screen drew;
   * behind a fold, four inputs and a submit are drawn and invisible, so the contrast
   * walk, the 44px floor and the 390px measure all stop at the summary bar. ADR-0026 met
   * the same thing on the Tender detail and answered it the same way — a second record of
   * the screen with the fold open — and there the folds are composed by the caller, so
   * the caller could simply say `defaultOpen`. This one is composed in here, and so needs
   * saying from out there.
   *
   * Left `false` by the page. A refused submit opens the fold regardless of it.
   */
  defaultOpen?: boolean;
}) {
  const t = useTranslations("tenders");
  const [state, formAction, isPending] = useActionState(addTenderItemAction, initialState);

  return (
    <Fold level={3} title={t("item.add")} defaultOpen={defaultOpen || wasRefused(state)}>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="tenderId" value={tenderId} />

        <TenderProblemNotice error={state.error} />
        {/* Nothing after a successful add, so the panel comes back blank for the next
            Item; the refused row, so it does not have to be typed again. */}
        <TenderItemInputs
          domId={`item-new-${tenderId}`}
          defaults={state.submitted?.items?.[0]}
        />

        <div>
          <Button
            type="submit"
            variant="outline"
            disabled={isPending}
            className="h-11"
          >
            {isPending ? t("form.saving") : t("item.add")}
          </Button>
        </div>
      </form>
    </Fold>
  );
}
