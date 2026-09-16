import { describe, expect, it } from "vitest";

import { confirmStep } from "@/lib/confirm";
import type { Settings } from "@/lib/env";
import { signToken, tokenLifetimeMs } from "@/lib/token";

/**
 * **Opening the link is not confirming**, which is the one claim on this site that a
 * mail gateway can falsify on its own. Outlook Safe Links and Gmail's link checker fetch
 * every URL in a message before a human sees it; if `inspect` ever reached Resend, the
 * Audience would fill with the addresses of everybody whose employer scans their mail —
 * silently, with the page still looking correct to everybody who tested it by hand.
 *
 * So the boundary is injected and counted. A recording `fetch` rather than a global stub,
 * for the reason the app's ADR-0012 already gives: a global takes unrelated traffic down
 * with it, and a call that was never made is only provable at a seam that exists.
 */

const settings: Settings = {
  resendApiKey: "re_test_key_never_sent_anywhere",
  audienceId: "aud_test",
  secret: "a-secret-long-enough-to-be-a-real-one",
  replyTo: "mike@example.test",
  siteOrigin: "https://awardley.test",
};

const noon = Date.UTC(2026, 8, 16, 12, 0, 0);

function recorder(answer: () => Response) {
  const calls: string[] = [];

  return {
    calls,
    boundary: {
      fetch: (async (url: string | URL | Request) => {
        calls.push(String(url));
        return answer();
      }) as unknown as typeof globalThis.fetch,
    },
  };
}

const accepted = () => new Response("{}", { status: 200 });

async function goodToken() {
  return signToken("alice@example.com", noon + tokenLifetimeMs, settings.secret);
}

describe("opening the confirmation link", () => {
  it("reaches Resend not at all", async () => {
    const { calls, boundary } = recorder(accepted);

    const status = await confirmStep("inspect", await goodToken(), settings, noon, boundary);

    expect(status).toBe("ready");
    expect(calls).toEqual([]);
  });

  it("still refuses a stale link without reaching Resend", async () => {
    const { calls, boundary } = recorder(accepted);
    const token = await signToken("alice@example.com", noon - 1, settings.secret);

    const status = await confirmStep("inspect", token, settings, noon, boundary);

    expect(status).toBe("expired");
    expect(calls).toEqual([]);
  });

  it("refuses an empty token without reaching Resend", async () => {
    const { calls, boundary } = recorder(accepted);

    await expect(confirmStep("inspect", "", settings, noon, boundary)).resolves.toBe(
      "expired",
    );
    expect(calls).toEqual([]);
  });
});

describe("pressing the button", () => {
  it("adds the contact, and only then", async () => {
    const { calls, boundary } = recorder(accepted);

    const status = await confirmStep("commit", await goodToken(), settings, noon, boundary);

    expect(status).toBe("ok");
    expect(calls).toEqual([
      "https://api.resend.com/audiences/aud_test/contacts",
    ]);
  });

  it("treats an address already on the list as a success", async () => {
    // Re-clicking a link that still has hours left on it, or pressing the button twice.
    const { boundary } = recorder(() => new Response("{}", { status: 409 }));

    await expect(
      confirmStep("commit", await goodToken(), settings, noon, boundary),
    ).resolves.toBe("ok");
  });

  it("says `failed`, not `expired`, when Resend will not answer", async () => {
    // The distinction the reader depends on: a good link and a bad afternoon must not
    // send somebody back to the form for a second email that hits the same outage.
    const { boundary } = recorder(() => new Response("{}", { status: 503 }));

    await expect(
      confirmStep("commit", await goodToken(), settings, noon, boundary),
    ).resolves.toBe("failed");
  });

  it("refuses a forged token before it reaches Resend", async () => {
    const { calls, boundary } = recorder(accepted);
    const forged = await signToken("mallory@example.com", noon + tokenLifetimeMs, "wrong");

    const status = await confirmStep("commit", forged, settings, noon, boundary);

    expect(status).toBe("expired");
    expect(calls).toEqual([]);
  });
});
