"use client";

import { useTranslations } from "next-intl";

import { usePanelBeat } from "@/components/ambient-stage";

/**
 * The beat of each sixteen-second cycle the Reminder arrives on — one of four, so it is a
 * thing that happens now and then rather than a thing that happens constantly. Deliberately
 * not the first: the panel's opening beat already has the sheet re-quoting and the light
 * lifting in it, and a third arrival on top of those is a pile-up rather than a story.
 */
const ON_BEAT = 2;

/**
 * A Reminder landing on the phone, as the phone's own mail notification.
 *
 * **What ties the two halves of the panel together.** The sheet on the right is the desk
 * job — twelve quotes, four answers, a Bid. The phone on the left is what the same tender
 * looks like to the person actually chasing one of those quotes. Every so often the thing
 * that reaches that person reaches them here, and the reader watches the product's second
 * half happen without a word of copy being spent on it. *Reminders by email* is a claim the
 * page used to make under the headline and no longer does, because this is it, shown.
 *
 * **It is the phone's notification, not the app's.** Awardley has no in-app toast and this
 * page does not get to invent one — the whole argument of the panel is that what is on it
 * is checkable. What a Reminder actually is is an email (ADR-0034 makes Email the floor for
 * them), so what is drawn is a mail banner sliding down over the app, which is what a real
 * phone does with a real one. The line it carries is the app's own string, from
 * `email.reminder.milestone.internal_quote` and `email.remaining.days`, cut to the two
 * pieces a banner has room for.
 *
 * `aria-hidden`, and not because the text is decorative furniture. It is drawn over a
 * screenshot that already says what it is in its `alt`, and a screen reader announcing a
 * deadline email arriving — one that is not addressed to the listener and cannot be opened —
 * would be the page telling its one lie out loud.
 *
 * Nothing is rendered between beats. A banner that lived in the DOM with its animation
 * finished would be an invisible thing to keep re-reading; mounting it on the beat is also
 * what plays `notice-arrive` without a class being cycled, and the keyframes take it back
 * off screen well inside the four seconds before the next beat.
 */
export function PhoneNotice() {
  const t = useTranslations("notice");
  const { turn } = usePanelBeat();

  if (turn % 4 !== ON_BEAT) return null;

  return (
    <div
      aria-hidden="true"
      className="notice-arrive absolute inset-x-[7%] top-[3.5%] flex flex-col gap-0.5 rounded-2xl border border-border/70 bg-background/85 px-3 py-2 shadow-[0_8px_20px_-8px_rgb(0_0_0/0.35)] backdrop-blur-[3px]"
    >
      {/*
        Sentence case, because no phone shouts the name of the app a banner came from — and
        a small-caps label row would be the page's own vocabulary showing through something
        that is meant to be the operating system's.
      */}
      <div className="flex items-baseline justify-between text-[0.5rem] leading-none text-muted-foreground">
        <span>{t("app")}</span>
        <span>{t("when")}</span>
      </div>

      <p className="text-[0.6rem] leading-snug font-semibold">{t("from")}</p>

      <p className="text-[0.6rem] leading-snug text-muted-foreground">{t("line")}</p>
    </div>
  );
}
