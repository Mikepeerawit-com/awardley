"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { joinWaitingList, type JoinState } from "@/app/actions/waiting-list";
import { SubmitButton } from "@/components/submit-button";

/**
 * One email field, one submit, and a field nobody is meant to see.
 *
 * **The honeypot is hidden by geometry, not by `display: none`.** A bot that parses CSS
 * skips a display-none input, which is the one thing this must not let it do. It is
 * pushed out of the viewport instead and marked `aria-hidden` with `tabIndex={-1}` and
 * `autoComplete="off"`, so a screen reader never announces it and a keyboard never lands
 * on it — but a form-filler walking the DOM finds an `<input name="website">` and takes
 * the bait. `website` is the name because that is the field these things most reliably
 * want to fill.
 *
 * **Success and silence look the same.** `sent` is what comes back from a real send, a
 * filled honeypot, a BotID flag and a Resend outage alike; the only other answer is
 * `invalid`, which is about the shape of what was typed and gives nothing away about
 * whether an address is known.
 */
export function WaitingListForm() {
  const t = useTranslations("beta");
  const [state, action] = useActionState<JoinState, FormData>(joinWaitingList, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <p
        className="rounded-surface border border-signal-edge bg-signal-wash px-4 py-3 text-signal-ink"
        role="status"
      >
        {t("success")}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-label">
      <label htmlFor="waiting-list-email" className="sr-only">
        {t("emailLabel")}
      </label>

      <div className="flex flex-col gap-label sm:flex-row">
        <input
          id="waiting-list-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
          aria-invalid={state.status === "invalid"}
          aria-describedby={state.status === "idle" ? undefined : "waiting-list-message"}
          className="min-w-0 flex-1 rounded-control border border-input bg-background px-3.5 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        />

        <SubmitButton
          label={t("submit")}
          pending={t("submitting")}
          // Beside a flexible field, so it may not be squeezed to fit the row.
          className="shrink-0"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="website">{t("honeypotLabel")}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status !== "idle" && (
        <p id="waiting-list-message" role="alert" className="text-sm text-alarm-ink">
          {t(state.status === "invalid" ? "invalid" : "failed")}
        </p>
      )}

      <p className="type-quiet">
        {t("privacyNote")}{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          {t("privacyLink")}
        </Link>
      </p>
    </form>
  );
}
