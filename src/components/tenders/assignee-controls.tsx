"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  addAssigneeAction,
  removeAssigneeAction,
  type TenderFormState,
} from "@/app/actions/tenders";
import { TenderProblemNotice } from "@/components/tenders/tender-problem";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Member } from "@/lib/org/members";

const initialState: TenderFormState = {};

/**
 * Who is sourcing this Tender Item.
 *
 * One of these per Item, never one per Tender: assignment is per Item (ADR-0033), and
 * how many people an Owner puts on each is the whole of competing versus dividing.
 * Adding yourself is one button and asks nobody — the step exists to enrol you in the
 * Item's reminders before you start ringing suppliers. Adding or removing someone else
 * is the Owner's, and the picker only renders for them — the real gate is in the server
 * action.
 *
 * **An Item with nobody on it says Nobody Sourcing** rather than drawing nothing: the
 * empty state is the one with work outstanding in it, and the control that fixes it is
 * directly underneath what it says.
 *
 * The group role carries the Item's name, because a screen with six of these renders
 * six identical buttons: "Add me" is only an instruction once a screen reader can say
 * which Item it enrols you on.
 */
export function AssigneeControls({
  tenderId,
  itemId,
  itemName,
  assignees,
  members,
  callerId,
  isOwner,
}: {
  /** The Item's Tender — posted for the revalidate, never trusted for the write. */
  tenderId: string;
  itemId: string;
  /** Read for the accessible name only; the visible heading is the caller's. */
  itemName: string;
  assignees: Member[];
  members: Member[];
  callerId: string;
  isOwner: boolean;
}) {
  const t = useTranslations("tenders.assignees");

  const assigned = new Set(assignees.map((assignee) => assignee.id));
  const unassigned = members.filter((member) => !assigned.has(member.id));

  // No heading and no `<section>` of its own: every place this renders — an Item's
  // block on the Tender detail, its panel on the edit screen, the quote screen's way
  // in — has already named the Item, and the group label repeats it only where sight
  // does not reach. The block still lays itself out — at `gap-group` since #154,
  // because the list of Assignees and the control that adds one are two different
  // things inside one block.
  return (
    <div
      role="group"
      aria-label={t("groupLabel", { product: itemName })}
      className="flex min-w-0 flex-col gap-group"
    >
      {assignees.length === 0 ? (
        <p className="text-sm">{t("nobodySourcing")}</p>
      ) : (
        <ul className="flex flex-col gap-field">
          {assignees.map((assignee) => (
            <li key={assignee.id} className="flex items-center gap-3">
              <span className="text-sm">{assignee.name}</span>
              {isOwner || assignee.id === callerId ? (
                <RemoveForm
                  tenderId={tenderId}
                  itemId={itemId}
                  userId={assignee.id}
                  label={assignee.id === callerId ? t("removeMe") : t("remove")}
                  pendingLabel={
                    assignee.id === callerId ? t("removingMe") : t("removing")
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {assigned.has(callerId) ? null : (
          <AddForm
            tenderId={tenderId}
            itemId={itemId}
            userId={callerId}
            label={t("addMe")}
            pendingLabel={t("addingMe")}
          />
        )}

        {isOwner && unassigned.length > 0 ? (
          <AddPicker tenderId={tenderId} itemId={itemId} members={unassigned} />
        ) : null}
      </div>
    </div>
  );
}

function AddForm({
  tenderId,
  itemId,
  userId,
  label,
  pendingLabel,
}: {
  tenderId: string;
  itemId: string;
  userId: string;
  label: string;
  /** What the button says while the write is in flight — see {@link RemoveForm}. */
  pendingLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(addAssigneeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-label">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="userId" value={userId} />

      <TenderProblemNotice error={state.error} />

      <Button type="submit" variant="outline" disabled={isPending} className="h-11">
        {isPending ? pendingLabel : label}
      </Button>
    </form>
  );
}

function AddPicker({
  tenderId,
  itemId,
  members,
}: {
  tenderId: string;
  itemId: string;
  members: Member[];
}) {
  const t = useTranslations("tenders.assignees");
  const [state, formAction, isPending] = useActionState(addAssigneeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-label">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="itemId" value={itemId} />

      <TenderProblemNotice error={state.error} />

      <div className="flex items-center gap-2">
        <NativeSelect
          name="userId"
          aria-label={t("pick")}
          className="h-11 w-auto min-w-44"
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={isPending} className="h-11">
          {isPending ? t("adding") : t("add")}
        </Button>
      </div>
    </form>
  );
}

/**
 * Taking one person off, whether that is themselves or a colleague.
 *
 * Both words are handed in rather than chosen here, because the caller is the only thing
 * that knows which of the two this row is — and the pending word has to be the *same*
 * kind of sentence as the idle one. *Take me off* becoming *Taking you off…* is what
 * makes the second press unnecessary; a shared *Removing…* under both would be a control
 * that answered in a voice it does not otherwise use (#144).
 */
function RemoveForm({
  tenderId,
  itemId,
  userId,
  label,
  pendingLabel,
}: {
  tenderId: string;
  itemId: string;
  userId: string;
  label: string;
  /** What it says instead, for as long as the write is in flight. */
  pendingLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(
    removeAssigneeAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="userId" value={userId} />

      <Button type="submit" variant="ghost" size="sm" className="h-11" disabled={isPending}>
        {isPending ? pendingLabel : label}
      </Button>

      <TenderProblemNotice error={state.error} />
    </form>
  );
}
