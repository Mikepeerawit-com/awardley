"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { startCheckoutAction, type CheckoutState } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CheckoutState = {};

/**
 * How many people the plan should pay for, and the button that hands the question to
 * Stripe.
 *
 * **The box starts at the number of people who are in the organisation now**, because
 * that is the answer almost every Administrator wants and the only one that cannot be
 * wrong on the day they press it. A blank box would make everybody do arithmetic they
 * have already done by inviting their colleagues.
 *
 * **`min` is that same number rather than 1.** It is a hint and not a gate — the gate is
 * `startCheckout`, which refuses `too_few` for a quantity below the live count — but it
 * is the hint that stops somebody paying for four people and then wondering why the
 * fifth colleague can no longer be invited. A number input is right here for the reason
 * the FX Buffer's is not: a count has no decimal point to lose and no unit to confuse,
 * so the numeric keypad costs nothing.
 *
 * **Nothing is charged by pressing this.** The action opens a Stripe Checkout and
 * redirects, and the card is entered there — which is why the button says what it is
 * doing while it waits rather than claiming anything has been bought.
 */
export function BillingSubscribeForm({ live }: { live: number }) {
  const t = useTranslations("billing");
  const [state, formAction, isPending] = useActionState(
    startCheckoutAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-field">
      <p className="type-quiet">{t("subscribeForm.explain")}</p>

      <div className="flex flex-col gap-label">
        <Label htmlFor="quantity">{t("subscribeForm.label")}</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          inputMode="numeric"
          min={live}
          max={999}
          step={1}
          defaultValue={String(live)}
          autoComplete="off"
          className="h-11 w-28"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending} className="h-11">
          {isPending ? t("subscribeForm.submitting") : t("subscribeForm.submit")}
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
