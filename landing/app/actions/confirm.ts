"use server";

import { confirmStep, type ConfirmStatus } from "@/lib/confirm";
import { readSettings } from "@/lib/env";

export type ConfirmState = { status: ConfirmStatus };

/**
 * The press. It re-verifies the token rather than trusting the hidden field it arrived
 * in — the page that rendered the button proved nothing that survives the round trip,
 * and the token is cheap to check twice.
 */
export async function confirmSubscription(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const token = String(formData.get("token") ?? "");

  const { settings, error } = readSettings();

  if (settings === null) {
    console.error(`confirm: ${error}`);

    // Not `expired`: the reader's link is fine, this deployment is not. `failed` is the
    // answer that leaves the button on screen for whenever somebody sets the variable.
    return { status: "failed" };
  }

  return { status: await confirmStep("commit", token, settings, Date.now()) };
}
