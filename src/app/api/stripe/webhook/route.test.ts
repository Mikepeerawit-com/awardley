import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

/**
 * The webhook's guard, and nothing else.
 *
 * What a subscription *does* to an organisation is asserted in
 * `src/lib/billing/subscription.test.ts`, against the Stripe boundary a route handler
 * has nowhere to take as an argument. What is left here is the half that belongs to the
 * handler: this endpoint moves organisations between plans, so it must refuse anybody
 * who is not Stripe — and it must refuse before it reads anything.
 *
 * The one request that gets past the guard carries an event type nothing listens to, so
 * that proving the signature check accepts a genuine signature costs no call to Stripe:
 * a handled event would re-read the subscription over the network, and a test that
 * reaches the network is a test that fails on a train.
 */

const secret = "whsec_not_the_real_one";

function webhookRequest(payload: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "content-type": "application/json", ...headers },
  });
}

function signed(payload: string): Request {
  return webhookRequest(payload, {
    "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload, secret }),
  });
}

const ignoredEvent = JSON.stringify({
  id: "evt_test",
  object: "event",
  type: "invoice.paid",
  data: { object: { id: "in_test", object: "invoice" } },
});

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_not_the_real_one");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("gives an unsigned caller nothing to work with", async () => {
    // Not a 400 yet: with no signature at all the caller is not Stripe, and whether the
    // endpoint is wired up is not theirs to learn. Stripe always signs.
    const response = await POST(webhookRequest(ignoredEvent));

    expect(response.status).toBe(400);
  });

  it("refuses a signature made with the wrong secret", async () => {
    const forged = Stripe.webhooks.generateTestHeaderString({
      payload: ignoredEvent,
      secret: "whsec_guessed",
    });

    const response = await POST(webhookRequest(ignoredEvent, { "stripe-signature": forged }));

    expect(response.status).toBe(400);
  });

  it("refuses a payload that was changed after signing", async () => {
    const request = webhookRequest(ignoredEvent.replace("invoice.paid", "invoice.void"), {
      "stripe-signature": Stripe.webhooks.generateTestHeaderString({
        payload: ignoredEvent,
        secret,
      }),
    });

    expect((await POST(request)).status).toBe(400);
  });

  it("refuses everything when the deployment has no secret set", async () => {
    // Closed by default, and silent about it: the alternative is a deployment that
    // forgot one variable accepting any body somebody cares to post.
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

    expect((await POST(signed(ignoredEvent))).status).toBe(404);
  });

  it("accepts a genuine signature and reports what it did not handle", async () => {
    // Past the guard — which is the only way to reach this — and a 200 for an event
    // nothing listens to, because Stripe retries anything else for days and a fourth
    // delivery of an ignored event is still ignored.
    const response = await POST(signed(ignoredEvent));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      type: "invoice.paid",
      handled: false,
    });
  });
});
