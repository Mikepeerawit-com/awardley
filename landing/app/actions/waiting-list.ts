"use server";

import { checkBotId } from "botid/server";
import { getLocale, getTranslations } from "next-intl/server";

import { readSettings, sender } from "@/lib/env";
import { sendEmail } from "@/lib/resend";
import { signToken, tokenLifetimeMs } from "@/lib/token";

export type JoinState = { status: "idle" | "sent" | "invalid" | "failed" };

/**
 * A shape a human can carry in their head: something before an `@`, something after it,
 * a dot in the domain, no spaces or angle brackets anywhere. It is the same test the
 * app's sender check applies, and it is deliberately not RFC 5322.
 *
 * The real validation is the confirmation email. An address that passes this and does
 * not exist simply never confirms, and nothing is ever stored for it — so a stricter
 * pattern here would only buy rejections of the unusual-but-valid addresses that a
 * stricter pattern always rejects.
 */
const emailShape = /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/;

/**
 * **Every path out of here that is not a malformed address returns `sent`.**
 *
 * A bot that fills the honeypot, a request BotID flags, a Resend outage, a deployment
 * missing `RESEND_API_KEY` — all four say "check your inbox", because every distinction
 * this action could draw is a distinction somebody would enumerate. Telling a scraper
 * that *this* address was refused and *that* one accepted turns the form into an oracle;
 * telling it that its automation was spotted tells it to try something else.
 *
 * The cost is that a genuine outage is silent to the visitor. That is the right side of
 * the trade for a waiting list — nobody is blocked from doing their job by it — and the
 * server log is where it is not silent.
 */
export async function joinWaitingList(
  _previous: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const email = String(formData.get("email") ?? "").trim();

  // The honeypot, before anything expensive. A field no human sees and no human fills;
  // the ones that fill it get the success sentence and no email.
  if (String(formData.get("website") ?? "") !== "") return { status: "sent" };

  if (!emailShape.test(email)) return { status: "invalid" };

  const verification = await checkBotId();

  if (verification.isBot) return { status: "sent" };

  const { settings, error } = readSettings();

  if (settings === null) {
    console.error(`waiting list: ${error}`);
    return { status: "sent" };
  }

  const locale = await getLocale();
  const t = await getTranslations("email");

  // The run instant is read here, at the request boundary, and passed down — the same
  // rule ADR-0010 states for the app, which is what lets `verifyToken` be tested against
  // a `now` of the test's own choosing rather than against the clock.
  const expiresAt = Date.now() + tokenLifetimeMs;
  const token = await signToken(email, expiresAt, settings.secret);
  const link = `${settings.siteOrigin}/confirm?token=${encodeURIComponent(token)}`;

  const outcome = await sendEmail(settings.resendApiKey, {
    from: sender,
    to: email,
    replyTo: settings.replyTo,
    subject: t("subject"),
    text: t("body", { link }),
  });

  if (!outcome.ok) {
    // The address is deliberately not logged: an unconfirmed address is one we promised
    // not to keep, and a log line is keeping it.
    console.error(`waiting list: send failed in ${locale} — ${outcome.detail}`);
  }

  return { status: "sent" };
}
