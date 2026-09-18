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
 * **It stands on the page's own ground now**, not on a coloured band, so it dresses like
 * everything else: the field is the page background inside a `--input` edge — a full step
 * darker than the hairline, because SC 1.4.11 asks 3:1 of anything you can operate and a
 * hairline that passed it would draw a wireframe everywhere else — and the notice and the
 * error take the page's muted ink and its danger ink rather than an alpha off white.
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
      // `rise` because a reply is an arrival: the form was there and now this is, and the
      // one gesture the page has is what says so. Same 420ms and same curve as the hero,
      // with no delay — there is nothing for it to stagger against.
      <p
        className="rise rounded-xl border border-border bg-card px-4 py-3 text-pretty"
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
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3.5 text-base text-left placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
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
        <p id="waiting-list-message" role="alert" className="text-sm text-danger">
          {t(state.status === "invalid" ? "invalid" : "failed")}
        </p>
      )}

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("privacyNote")}{" "}
        <Link
          href="/privacy"
          className="text-foreground underline decoration-border transition-colors duration-200 hover:decoration-foreground"
        >
          {t("privacyLink")}
        </Link>
      </p>
    </form>
  );
}
