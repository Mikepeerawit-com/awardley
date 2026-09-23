"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { openPortalAction, type PortalState } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

const initialState: PortalState = {};

/**
 * The way out to Stripe's own billing portal, and the reason this screen is short.
 *
 * **Changing a card, changing how many people the plan pays for, and stopping paying are
 * all Stripe's screens rather than ours.** Rebuilding them here would mean this app
 * holding card details, proration rules and cancellation wording that Stripe already
 * holds correctly in every locale it sells in — and it would mean a second place where
 * what an organisation pays for could be decided. Stripe is the source of truth; a change
 * made over there reaches the org row through the webhook.
 *
 * **It is drawn only when there is a Customer to open a portal for**, which the page
 * decides from `hasStripeCustomer`. The refusal is still worded, because a portal session
 * is minted by a live call to Stripe and the two ways it can fail — no customer after
 * all, or Stripe unreachable — are the two moments somebody is standing in front of a
 * card that has stopped working.
 */
export function BillingPortalForm() {
  const t = useTranslations("billing");
  const [state, formAction, isPending] = useActionState(openPortalAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-field">
      <p className="type-quiet">{t("portalForm.explain")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary" disabled={isPending} className="h-11">
          {isPending ? t("portalForm.submitting") : t("portalForm.submit")}
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
