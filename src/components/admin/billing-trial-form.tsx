"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { startTrialAction, type TrialState } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

const initialState: TrialState = {};

/**
 * The one button that buys the paid plan without a card.
 *
 * **It has no field, and that is the whole design.** A trial is a plan state rather than
 * a purchase — no customer, no card, no number of people to pick — so the form is the
 * button, and the only thing the Administrator supplies is having pressed it. Anything
 * else on it would be a question whose answer the trial does not use.
 *
 * **It is drawn only when a trial is still there to take**, which the page decides; what
 * this holds is the sentence for every way the server can still refuse one. That is not
 * belt and braces over an already-correct screen: the drawn/not-drawn decision is made
 * from a row that was read a moment earlier, and the second Administrator pressing this
 * at the same time as the first is refused `trial_used` by a server that is right.
 *
 * On success there is nothing to say: the action redraws this screen with the trial's end
 * date on it and this form gone.
 */
export function BillingTrialForm() {
  const t = useTranslations("billing");
  const [state, formAction, isPending] = useActionState(startTrialAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-field">
      <p className="type-quiet">{t("trialForm.explain")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending} className="h-11">
          {isPending ? t("trialForm.starting") : t("trialForm.start")}
        </Button>
        {state.status ? (
          <span role="status" className="text-destructive text-xs">
            {t(`status.${state.status}`)}
          </span>
        ) : null}
      </div>
    </form>
  );
}
