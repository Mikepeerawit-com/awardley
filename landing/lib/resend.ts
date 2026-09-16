import "server-only";

/**
 * Resend over raw `fetch`, the same shape as the app's `src/lib/email/send.ts`.
 *
 * Deliberately not the `resend` SDK. The app already talks to this provider with a POST
 * and a bearer token, and the two surfaces here — one send, one contact — are three
 * fields each. A second dependency to express that would put an SDK's release cadence
 * between this site and its only outbound call, and the site has no `/api/health` to
 * notice when that goes wrong.
 *
 * **An accepted email is not a read one.** Resend's 200 says the message was accepted for
 * delivery and nothing more (ADR-0034). Nothing here builds on it beyond letting the
 * visitor see "check your inbox", which is a claim about what we did, not about what
 * arrived.
 */

const emailEndpoint = "https://api.resend.com/emails";
const audienceEndpoint = "https://api.resend.com/audiences";

/** The outbound boundary, injected so a test can stand at it without a global stub. */
export type ResendBoundary = { fetch?: typeof globalThis.fetch };

export type ResendOutcome = { ok: true } | { ok: false; detail: string };

export async function sendEmail(
  apiKey: string,
  message: { from: string; to: string; replyTo: string; subject: string; text: string },
  boundary: ResendBoundary = {},
): Promise<ResendOutcome> {
  return post(
    emailEndpoint,
    apiKey,
    {
      from: message.from,
      to: message.to,
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
    },
    boundary,
  );
}

/**
 * Add a confirmed address to the Audience.
 *
 * **An address already on the list is a success, not a conflict.** #183 asks for this
 * explicitly: re-clicking a link that still has hours left on it, or signing up twice
 * from two devices, must land a reader on "you are on the list" rather than on an error
 * that reads as though they did something wrong. Resend answers a duplicate with a 409;
 * some versions answer with a 200 carrying the existing contact. Both are treated the
 * same way here, which is why the status check is a range and not equality.
 */
export async function addContact(
  apiKey: string,
  audienceId: string,
  email: string,
  boundary: ResendBoundary = {},
): Promise<ResendOutcome> {
  return post(
    `${audienceEndpoint}/${encodeURIComponent(audienceId)}/contacts`,
    apiKey,
    { email, unsubscribed: false },
    boundary,
    // 409 on a create *is* "it is already there", whatever the body says. 422 is the
    // looser refusal and has to be read before it can be called the same thing.
    (status, detail) =>
      status === 409 || (status === 422 && /already|exist|duplicate/i.test(detail)),
  );
}

async function post(
  url: string,
  apiKey: string,
  body: unknown,
  boundary: ResendBoundary,
  alsoOk: (status: number, detail: string) => boolean = () => false,
): Promise<ResendOutcome> {
  const send = boundary.fetch ?? globalThis.fetch;

  let response: Response;

  try {
    response = await send(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    return { ok: false, detail: reasonFrom(cause) };
  }

  if (response.ok) return { ok: true };

  const detail = await detailOf(response);

  if (alsoOk(response.status, detail)) return { ok: true };

  return { ok: false, detail };
}

async function detailOf(response: Response): Promise<string> {
  let said = "";

  try {
    const body = (await response.json()) as { message?: string; name?: string };

    said = typeof body.message === "string" ? `: ${body.message}` : "";
  } catch {
    // The status alone is still the fact worth carrying.
  }

  return `HTTP ${response.status}${said}`;
}

function reasonFrom(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
