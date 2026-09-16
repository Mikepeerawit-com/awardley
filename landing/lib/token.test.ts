import { describe, expect, it } from "vitest";

import { signToken, tokenLifetimeMs, verifyToken } from "@/lib/token";

/**
 * The token is the whole of the waiting list's security, because it is the whole of its
 * storage: nothing exists between the form and the Audience but this string. So the
 * three ways it can fail are asserted rather than reasoned about.
 *
 * `now` is a number this file chooses rather than the clock, which is the same rule
 * ADR-0010 states for the app — a date rule read off the wall clock is a date rule that
 * cannot be tested, and an expiry test that waits 48 hours is not a test.
 */

const secret = "a-secret-long-enough-to-be-a-real-one";
const noon = Date.UTC(2026, 8, 16, 12, 0, 0);

describe("the confirmation token", () => {
  it("verifies an address it signed, unchanged", async () => {
    const token = await signToken("alice@example.com", noon + tokenLifetimeMs, secret);

    await expect(verifyToken(token, secret, noon)).resolves.toEqual({
      ok: true,
      email: "alice@example.com",
    });
  });

  it("carries an address through base64url intact, plus signs and dots and all", async () => {
    // The characters base64 is picky about, in the place they actually turn up: a
    // plus-addressed Gmail is the commonest address a waiting list receives.
    const email = "alice+awardley.beta@example.co.uk";
    const token = await signToken(email, noon + tokenLifetimeMs, secret);

    await expect(verifyToken(token, secret, noon)).resolves.toEqual({ ok: true, email });

    // And nothing in it needs escaping to survive a URL, which is how it travels.
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("refuses one whose 48 hours have run out", async () => {
    const expiresAt = noon + tokenLifetimeMs;
    const token = await signToken("alice@example.com", expiresAt, secret);

    // A second before the expiry it still works; a second after it does not. Asserting
    // both is what keeps this from passing on a token that was never valid at all.
    await expect(verifyToken(token, secret, expiresAt - 1000)).resolves.toMatchObject({
      ok: true,
    });
    await expect(verifyToken(token, secret, expiresAt + 1000)).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("refuses one whose payload was edited", async () => {
    const token = await signToken("alice@example.com", noon + tokenLifetimeMs, secret);
    const [, signature] = token.split(".");

    // Somebody swapping in their own address while keeping the signature they were given.
    const forged = await signToken("mallory@example.com", noon + tokenLifetimeMs, secret);
    const tampered = `${forged.split(".")[0]}.${signature}`;

    await expect(verifyToken(tampered, secret, noon)).resolves.toEqual({
      ok: false,
      reason: "tampered",
    });
  });

  it("refuses one signed with a different secret", async () => {
    const token = await signToken("alice@example.com", noon + tokenLifetimeMs, secret);

    await expect(verifyToken(token, `${secret}-rotated`, noon)).resolves.toEqual({
      ok: false,
      reason: "tampered",
    });
  });

  it("refuses an expired token before it reads its expiry", async () => {
    // The order matters: reading the expiry out of an unverified payload is reading an
    // attacker's own number, so a forged token that claims to be far in the future must
    // come back `tampered` rather than `ok`.
    const forged = `${(await signToken("mallory@example.com", noon + tokenLifetimeMs, "wrong-secret")).split(".")[0]}.AAAA`;

    await expect(verifyToken(forged, secret, noon)).resolves.toEqual({
      ok: false,
      reason: "tampered",
    });
  });

  it("refuses anything that is not two base64url parts", async () => {
    for (const rubbish of ["", ".", "nodot", "a.b.c", "!!!.AAAA"]) {
      await expect(verifyToken(rubbish, secret, noon)).resolves.toMatchObject({
        ok: false,
      });
    }
  });
});
