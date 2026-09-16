"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { confirmSubscription, type ConfirmState } from "@/app/actions/confirm";
import type { ConfirmStatus } from "@/lib/confirm";

/**
 * What the reader sees after they open the link, and what they see after they press.
 *
 * Four states, three of which draw the button: `ready` is a good token nobody has acted
 * on yet, `failed` is a good token and a provider that would not answer — both want the
 * same press — and `expired` is the dead end. `ok` is the only one that ends the journey.
 */
export function ConfirmPanel({ token, initial }: { token: string; initial: ConfirmStatus }) {
  const t = useTranslations("confirm");
  const [state, action] = useActionState<ConfirmState, FormData>(confirmSubscription, {
    status: initial,
  });

  if (state.status === "ok") {
    return (
      <section className="flex flex-col gap-label pb-group">
        <h1 className="type-display">{t("ok.title")}</h1>
        <p className="text-pretty text-muted-foreground">{t("ok.body")}</p>
      </section>
    );
  }

  if (state.status === "expired") {
    return (
      <section className="flex flex-col gap-label pb-group">
        <h1 className="type-display">{t("expired.title")}</h1>
        <p className="text-pretty text-muted-foreground">{t("expired.body")}</p>
        <p>
          <Link href="/" className="text-signal-ink underline underline-offset-2">
            {t("expired.home")}
          </Link>
        </p>
      </section>
    );
  }

  const heading = state.status === "failed" ? "failed" : "ready";

  return (
    <section className="flex flex-col gap-group pb-group">
      <div className="flex flex-col gap-label">
        <h1 className="type-display">{t(`${heading}.title`)}</h1>
        <p className="text-pretty text-muted-foreground">{t(`${heading}.body`)}</p>
      </div>

      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <Press label={t("button")} pending={t("pressing")} />
      </form>
    </section>
  );
}

function Press({ label, pending }: { label: string; pending: string }) {
  const status = useFormStatus();

  return (
    <button
      type="submit"
      disabled={status.pending}
      className="rounded-control bg-signal px-5 py-2.5 font-semibold text-background outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-70"
    >
      {status.pending ? pending : label}
    </button>
  );
}
