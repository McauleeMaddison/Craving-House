import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { createStripeCheckoutSession, getStripeRuntimeConfig, isStripeWebhookIpAllowed, verifyStripeWebhook } from "./stripe.ts";

test("getStripeRuntimeConfig trims values and detects test mode", () => {
  const config = getStripeRuntimeConfig({
    STRIPE_SECRET_KEY: "  sk_test_123  ",
    STRIPE_WEBHOOK_SECRET: "  stripe_webhook_secret_123  ",
    STRIPE_WEBHOOK_IP_ALLOWLIST: " 203.0.113.10, 203.0.113.11 "
  });

  assert.deepEqual(config, {
    secretKey: "sk_test_123",
    webhookSecret: "stripe_webhook_secret_123",
    webhookIpAllowlist: ["203.0.113.10", "203.0.113.11"],
    enabled: true,
    mode: "test"
  });
});

test("isStripeWebhookIpAllowed only enforces when an allowlist is configured", () => {
  assert.equal(isStripeWebhookIpAllowed({ ip: "203.0.113.10", allowlist: [] }), true);
  assert.equal(isStripeWebhookIpAllowed({ ip: "203.0.113.10", allowlist: ["203.0.113.10"] }), true);
  assert.equal(isStripeWebhookIpAllowed({ ip: "203.0.113.99", allowlist: ["203.0.113.10"] }), false);
});

test("createStripeCheckoutSession sends the expected Checkout payload", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers && (init.headers as Record<string, string>).authorization, "Bearer sk_test_123");

    const body = new URLSearchParams(String(init?.body ?? ""));
    assert.equal(body.get("mode"), "payment");
    assert.equal(body.get("currency"), "gbp");
    assert.equal(body.get("client_reference_id"), "order_123");
    assert.equal(body.get("metadata[orderId]"), "order_123");
    assert.equal(body.get("payment_intent_data[metadata][orderId]"), "order_123");
    assert.equal(body.get("customer_email"), "sam@example.com");
    assert.equal(body.get("line_items[0][quantity]"), "2");
    assert.equal(body.get("line_items[0][price_data][unit_amount]"), "450");
    assert.equal(body.get("line_items[0][price_data][product_data][name]"), "Flat White");

    return new Response(
      JSON.stringify({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_123"
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const session = await createStripeCheckoutSession({
    secretKey: "sk_test_123",
    orderId: "order_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    customerEmail: "sam@example.com",
    lineItems: [{ name: "Flat White", unitAmountCents: 450, qty: 2 }]
  });

  assert.deepEqual(session, {
    id: "cs_test_123",
    url: "https://checkout.stripe.com/c/pay/cs_test_123"
  });
});

test("createStripeCheckoutSession surfaces Stripe API errors", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: { message: "No such API key" }
      }),
      {
        status: 401,
        headers: { "content-type": "application/json" }
      }
    );

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    () =>
      createStripeCheckoutSession({
        secretKey: "sk_test_123",
        orderId: "order_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Flat White", unitAmountCents: 450, qty: 1 }]
      }),
    /No such API key/
  );
});

test("verifyStripeWebhook accepts a valid Stripe signature", () => {
  const rawBody = JSON.stringify({
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_123", client_reference_id: "order_123" } }
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const webhookSecret = "stripe_webhook_secret_123";
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const result = verifyStripeWebhook({
    rawBody,
    signatureHeader: `t=${timestamp},v1=${expected}`,
    webhookSecret
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.type, "checkout.session.completed");
  }
});

test("verifyStripeWebhook rejects an invalid Stripe signature", () => {
  const result = verifyStripeWebhook({
    rawBody: JSON.stringify({ type: "checkout.session.completed" }),
    signatureHeader: `t=${Math.floor(Date.now() / 1000)},v1=deadbeef`,
    webhookSecret: "stripe_webhook_secret_123"
  });

  assert.deepEqual(result, {
    ok: false,
    error: "Signature mismatch"
  });
});
