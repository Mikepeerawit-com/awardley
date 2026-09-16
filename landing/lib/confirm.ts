import type { Settings } from "@/lib/env";
import { addContact, type ResendBoundary } from "@/lib/resend";
import { verifyToken } from "@/lib/token";

/**
 * Confirming, in two steps that share one verification.
 *
 * **Opening the link must not be the confirmation.** Outlook Safe Links, Gmail's link
 * checker and most corporate mail gateways fetch every URL in a message before a human
 * ever sees it — so a `/confirm` that added the contact on GET would add the addresses
 * of everybody whose employer scans their mail and nobody who actually pressed anything.
 * That is the opposite of what double opt-in is for: the whole point is a deliberate act
 * by the person who owns the mailbox, and a scanner is not that person.
 *
 * So the link only *inspects*. The page it lands on carries a button, and the button
 * posts. A scanner will follow a link; it will not submit a form.
 *
 * `intent` is the whole difference between the two, and they are one function rather
 * than two so that a token cannot come to be verified one way on the page and another
 * way in the action. `boundary` is injected for the same reason the app injects its
 * email boundary: `inspect` performing no network call is a claim worth a test, and a
 * test can only stand at a seam that exists.
 */
export type ConfirmStatus = "ready" | "ok" | "expired" | "failed";

export async function confirmStep(
  intent: "inspect" | "commit",
  token: string,
  settings: Settings,
  now: number,
  boundary: ResendBoundary = {},
): Promise<ConfirmStatus> {
  if (token === "") return "expired";

  const verdict = await verifyToken(token, settings.secret, now);

  // Malformed, forged and stale all answer the same way, for the reason `verifyToken`
  // states: the only person who legitimately reaches this page holds a link we sent, and
  // "it expired, do it again" is the whole of the useful advice.
  if (!verdict.ok) return "expired";

  if (intent === "inspect") return "ready";

  const outcome = await addContact(
    settings.resendApiKey,
    settings.audienceId,
    verdict.email,
    boundary,
  );

  if (!outcome.ok) {
    // Deliberately distinct from `expired`. A reader whose token is good and whose
    // provider is down must not be told their link is stale — they would go back to the
    // form, get a second email, and hit the same outage. `failed` keeps the button on
    // screen and says the link is still good.
    console.error(`confirm: could not add the contact — ${outcome.detail}`);
    return "failed";
  }

  return "ok";
}
