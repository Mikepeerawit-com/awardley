/**
 * The confirmation token, and the whole of what stands between the form and the Audience.
 *
 * **Nothing is stored until the link is clicked** (#183). There is no pending-signups
 * table to expire, no row to reconcile, and no way for a submitted-but-never-confirmed
 * address to sit in a database nobody remembers writing to — which is the strongest
 * privacy claim `/privacy` makes, so it is held up by this file rather than by a policy.
 *
 * The consequence is that the token has to carry everything the confirm page needs:
 * `email|expiresAt`, signed. It is therefore a bearer credential — whoever holds the link
 * can add that address to the Audience — which is exactly the property double opt-in
 * wants, since the link went to that address and nowhere else.
 *
 * Web Crypto rather than `node:crypto`, so the same module runs unchanged in a test, in
 * a Node function and on an edge runtime, and so `timingSafeEqual` is not quietly the
 * only reason this file needs a Node runtime.
 */

/** 48 hours, as #183 states it. */
export const tokenLifetimeMs = 48 * 60 * 60 * 1000;

export type TokenVerdict =
  | { ok: true; email: string }
  | { ok: false; reason: "malformed" | "tampered" | "expired" };

export async function signToken(
  email: string,
  expiresAt: number,
  secret: string,
): Promise<string> {
  const payload = encodeBase64Url(new TextEncoder().encode(`${email}|${expiresAt}`));
  const signature = encodeBase64Url(await hmac(payload, secret));

  return `${payload}.${signature}`;
}

/**
 * The order of the three checks is load-bearing.
 *
 * Shape, then signature, then expiry — never expiry first. An expired token and a forged
 * one must be indistinguishable to anybody who did not hold a real link, and reading the
 * expiry out of an unverified payload is reading an attacker's own number. The page shows
 * one message for all three verdicts for the same reason; the reasons are here so a test
 * can tell them apart, not so a reader can.
 */
export async function verifyToken(
  token: string,
  secret: string,
  now: number,
): Promise<TokenVerdict> {
  const parts = token.split(".");

  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  const [payload, signature] = parts;

  if (payload === "" || signature === "") return { ok: false, reason: "malformed" };

  const expected = encodeBase64Url(await hmac(payload, secret));

  if (!constantTimeEqual(signature, expected)) return { ok: false, reason: "tampered" };

  let decoded: string;

  try {
    decoded = new TextDecoder().decode(decodeBase64Url(payload));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  // `lastIndexOf`, not `split`: the separator is a character an email address may not
  // contain, but reading the expiry from the end is true whatever the address holds.
  const separator = decoded.lastIndexOf("|");

  if (separator <= 0) return { ok: false, reason: "malformed" };

  const email = decoded.slice(0, separator);
  const expiresAt = Number(decoded.slice(separator + 1));

  if (!Number.isFinite(expiresAt)) return { ok: false, reason: "malformed" };
  if (expiresAt <= now) return { ok: false, reason: "expired" };

  return { ok: true, email };
}

async function hmac(payload: string, secret: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
}

/**
 * Constant time over two base64url strings of the same length — which they are, both
 * being a SHA-256 digest, whenever the comparison is close enough to be worth timing.
 * The length check leaks only what an attacker already knows from the algorithm name.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let difference = 0;

  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return difference === 0;
}

function encodeBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";

  for (const byte of view) binary += String.fromCharCode(byte);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("not base64url");

  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
