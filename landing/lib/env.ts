/**
 * The five variables this site needs, read in one place so that "it is not configured"
 * is a single shape rather than five different crashes.
 *
 * **Fail closed, and say so in the log rather than on the page.** A missing
 * `WAITING_LIST_SECRET` is Mike's problem, not the visitor's: the visitor gets the same
 * "check your inbox" sentence they would get on a real submit, and the server writes a
 * line naming what is unset. A stack trace on a marketing page is worse than useless —
 * it tells a stranger which provider we use and which variable to go looking for.
 *
 * The cost is honest and worth naming: a site deployed with a missing variable will
 * *look* like it is collecting addresses while collecting none. `/api/health` is how the
 * app answers that, and this site has no such probe — the first deploy is checked by
 * signing up once and watching the inbox, which is the whole of its acceptance test.
 */
export type Settings = {
  resendApiKey: string;
  audienceId: string;
  secret: string;
  replyTo: string;
  siteOrigin: string;
};

export type SettingsResult =
  | { settings: Settings; error: null }
  | { settings: null; error: string };

/** The sender is fixed rather than configured: #183 names the address in the spec. */
export const sender = "Awardley <hello@awardley.com>";

export function readSettings(): SettingsResult {
  const names = [
    "RESEND_API_KEY",
    "RESEND_AUDIENCE_ID",
    "WAITING_LIST_SECRET",
    "REPLY_TO",
    "SITE_ORIGIN",
  ] as const;

  const missing = names.filter((name) => (process.env[name] ?? "").trim() === "");

  if (missing.length > 0) {
    return {
      settings: null,
      error: `${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} not set, so the waiting list cannot work.`,
    };
  }

  return {
    settings: {
      resendApiKey: value("RESEND_API_KEY"),
      audienceId: value("RESEND_AUDIENCE_ID"),
      secret: value("WAITING_LIST_SECRET"),
      replyTo: value("REPLY_TO"),
      // Trailing slash stripped here so every caller can write `${siteOrigin}/confirm`
      // and none of them has to remember which half owns the separator.
      siteOrigin: value("SITE_ORIGIN").replace(/\/+$/, ""),
    },
    error: null,
  };
}

function value(name: string): string {
  return (process.env[name] ?? "").trim();
}
