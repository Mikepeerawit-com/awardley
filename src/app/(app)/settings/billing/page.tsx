import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { BillingPortalForm } from "@/components/admin/billing-portal-form";
import { BillingSubscribeForm } from "@/components/admin/billing-subscribe-form";
import { BillingTrialForm } from "@/components/admin/billing-trial-form";
import { Measure } from "@/components/ui/screen-body";
import { ScreenHeader } from "@/components/ui/screen-header";
import { currentUser } from "@/lib/auth/session";
import { instantDayFormat } from "@/lib/calendar-date";
import { isPaying } from "@/lib/billing/subscription";
import { liveMembershipCount } from "@/lib/org/members";
import { getOrgSettings } from "@/lib/org/org";
import { runInstantFromHeaders } from "@/lib/run-instant";

/**
 * What the organisation pays for, and the three ways an Administrator changes it. The
 * fourth screen in Settings' **Organisation** group (#180).
 *
 * Hidden from non-admins with `notFound()`, for the reason the other three give: a page
 * that says "you are not allowed here" also says that here exists. The real gates are in
 * `startTrial`, `startCheckout` and `openPortal`, which are what a posted form reaches.
 *
 * **It is not withheld by the plan, and it is the only Organisation screen that is not.**
 * Foreign prices belongs to the money layer and goes when the money does (#179); this one
 * is *how the money is bought*, so withholding it from a free organisation would hide the
 * upgrade behind the upgrade. It is the one screen where a sentence about the paid plan is
 * the point of the screen rather than an advertisement where a setting was.
 *
 * **Nothing here is a setting.** Every figure on it is Stripe's answer, read back off the
 * org row the webhook keeps (ADR for #180): which plan, how many people the plan pays for,
 * what Stripe calls the subscription today. The app never writes any of it from this
 * screen — the buttons send somebody to Stripe, and Stripe tells us what happened. That is
 * why the screen states the numbers rather than offering them in boxes.
 *
 * **The live Membership count is drawn beside the paid one** because the gap between them
 * is the only thing on this screen somebody has to act on: paying for four people with
 * five in the organisation is how an invitation starts being refused, and a screen that
 * showed only what is paid for would leave them reading the refusal on the People screen
 * with no idea where the number came from.
 *
 * The trial's end is an *instant* rather than a day column, so it is rendered in the org's
 * timezone with `instantDayFormat` — never the server's, which is UTC on Vercel and would
 * date a trial ending at 6am in Bangkok to the day before.
 */
export default async function BillingPage({
  searchParams,
}: PageProps<"/settings/billing">) {
  const store = await cookies();
  const user = await currentUser(store);

  if (!user?.isOrgAdmin) notFound();

  const t = await getTranslations("billing");
  const format = await getFormatter();
  const at = runInstantFromHeaders(await headers());
  const { checkout } = await searchParams;

  const {
    plan,
    timezone,
    paidMemberships,
    trialEndsAt,
    subscriptionStatus,
    hasStripeCustomer,
  } = await getOrgSettings(store);

  // The same count `membershipCapReached` refuses an invitation against, asked here so
  // that what this screen says about the gap and what the People screen enforces cannot
  // be two different numbers.
  const live = (await liveMembershipCount(user.orgId)) ?? 0;

  const day = (instant: string) =>
    format.dateTime(new Date(instant), instantDayFormat(timezone));

  return (
    <>
      <ScreenHeader heading={t("title")}>
        <p className="type-quiet">{t("description")}</p>
      </ScreenHeader>

      <Measure>
        <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
          <p className="text-sm">
            {plan.id === "paid" ? t("plan.paid") : t("plan.free")}
          </p>

          {/* A trial that has lapsed is still said out loud, and the date is kept for
              exactly this: an Administrator who finds the organisation back on the free
              plan is owed the day it happened, not a screen that has forgotten. */}
          {trialEndsAt !== null ? (
            <p className="type-quiet">
              {new Date(trialEndsAt) > at
                ? t("trial.ends", { date: day(trialEndsAt) })
                : t("trial.ended", { date: day(trialEndsAt) })}
            </p>
          ) : null}

          {paidMemberships !== null ? (
            <p className="type-quiet">{t("people", { paid: paidMemberships, live })}</p>
          ) : null}

          {/* The one status Stripe has that needs a sentence. The others — active,
              trialing, canceled — are already said by the plan line above, and a screen
              that narrated every one of Stripe's words would be teaching their vocabulary
              to somebody who only needs to know whether the card works. How long the
              retries last is Stripe's dunning setting, so this deliberately promises no
              number of days. */}
          {subscriptionStatus === "past_due" ? (
            <p className="text-destructive text-sm">{t("pastDue")}</p>
          ) : null}

          {/* Coming back from Checkout. Quiet, and careful not to say the plan has
              changed: the payment is confirmed by a webhook that may not have landed
              yet, so the honest sentence is that it updates when Stripe says so. */}
          {checkout === "success" ? (
            <p role="status" className="type-quiet">
              {t("thanks")}
            </p>
          ) : null}
        </section>
      </Measure>

      {/* Each offer is drawn only when it is really on offer — never drawn-and-disabled,
          which is this repo's rule for the Settings column and is the same argument here:
          a greyed Start free trial is an advertisement for something this organisation
          has already used. */}
      {trialEndsAt === null && subscriptionStatus === null ? (
        <Measure>
          <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
            <BillingTrialForm />
          </section>
        </Measure>
      ) : null}

      {/* Gated on Stripe's status word and not on the quantity, because a paying
          subscription that names no quantity is still paying — and the one thing that
          must never be offered to a paying organisation is a second Checkout. */}
      {!isPaying(subscriptionStatus) ? (
        <Measure>
          <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
            <BillingSubscribeForm live={live} />
          </section>
        </Measure>
      ) : null}

      {hasStripeCustomer ? (
        <Measure>
          <section className="bg-card rounded-surface shadow-surface flex flex-col gap-field p-4">
            <BillingPortalForm />
          </section>
        </Measure>
      ) : null}
    </>
  );
}
