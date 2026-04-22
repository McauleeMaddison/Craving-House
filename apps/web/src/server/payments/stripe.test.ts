import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { createStripeCheckoutSession, ensureStripeCustomer, getStripeRuntimeConfig, isStripeCheckoutSessionPaid, isStripeWebhookIpAllowed, verifyStripeWebhook } from "./stripe.ts";

test("getStripeRuntimeConfig trims values and detects test mode", () => {
  const config = getStripeRuntimeConfig({
    STRIPE_SECRET_KEY: "  sk_test__123  ",
    STRIPE_WEBHOOK_SECRET: "  stripe_webhook_secret_123  ",
    STRIPE_WEBHOOK_IP_ALLOWLIST: " 203.0.113.10, 203.0.113.11 "
  });

  assert.deepEqual(config, {
    secretKey: "sk_test__123",
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

test("createStripeCheckoutSession sends the expected Checkout payload for guest checkout with bank transfers", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers && (init.headers as Record<string, string>).authorization, "Bearer sk_test__123");

    const body = new URLSearchParams(String(init?.body ?? ""));
    assert.equal(body.get("mode"), "payment");
    assert.equal(body.get("currency"), "gbp");
    assert.equal(body.get("client_reference_id"), "order_123");
    assert.equal(body.get("metadata[orderId]"), "order_123");
    assert.equal(body.get("payment_intent_data[metadata][orderId]"), "order_123");
    assert.equal(body.get("customer"), "cus_guest_123");
    assert.equal(body.get("payment_method_types[0]"), "card");
    assert.equal(body.get("payment_method_types[1]"), "customer_balance");
    assert.equal(body.get("payment_method_options[customer_balance][funding_type]"), "bank_transfer");
    assert.equal(body.get("payment_method_options[customer_balance][bank_transfer][type]"), "gb_bank_transfer");
    assert.equal(body.get("line_items[0][quantity]"), "2");
    assert.equal(body.get("line_items[0][price_data][unit_amount]"), "450");
    assert.equal(body.get("line_items[0][price_data][product_data][name]"), "Flat White");
    assert.equal(body.get("saved_payment_method_options[payment_method_save]"), null);

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
    secretKey: "sk_test__123",
    orderId: "order_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    customerId: "cus_guest_123",
    allowBankTransfers: true,
    lineItems: [{ name: "Flat White", unitAmountCents: 450, qty: 2 }]
  });

  assert.deepEqual(session, {
    id: "cs_test_123",
    url: "https://checkout.stripe.com/c/pay/cs_test_123"
  });
});

test("createStripeCheckoutSession enables saved cards for signed-in customers", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(init?.method, "POST");

    const body = new URLSearchParams(String(init?.body ?? ""));
    assert.equal(body.get("customer"), "cus_test_123");
    assert.equal(body.get("customer_update[name]"), "auto");
    assert.equal(body.get("payment_method_types[0]"), "card");
    assert.equal(body.get("payment_method_types[1]"), "customer_balance");
    assert.equal(body.get("payment_method_options[customer_balance][funding_type]"), "bank_transfer");
    assert.equal(body.get("payment_method_options[customer_balance][bank_transfer][type]"), "gb_bank_transfer");
    assert.equal(body.get("saved_payment_method_options[payment_method_save]"), "enabled");
    assert.equal(body.get("saved_payment_method_options[payment_method_remove]"), "enabled");
    assert.equal(body.get("payment_method_collection"), null);
    assert.equal(body.get("customer_email"), null);
    assert.equal(body.get("payment_intent_data[setup_future_usage]"), null);

    return new Response(
      JSON.stringify({
        id: "cs_test_saved_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_saved_123"
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
    secretKey: "sk_test__123",
    orderId: "order_123",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    customerId: "cus_test_123",
    allowSavedPaymentMethods: true,
    allowBankTransfers: true,
    preferExpressWallets: true,
    lineItems: [{ name: "Flat White", unitAmountCents: 450, qty: 1 }]
  });

  assert.deepEqual(session, {
    id: "cs_test_saved_123",
    url: "https://checkout.stripe.com/c/pay/cs_test_saved_123"
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
        secretKey: "sk_test__123",
        orderId: "order_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Flat White", unitAmountCents: 450, qty: 1 }]
      }),
    /No such API key/
  );
});

test("ensureStripeCustomer creates a new customer when one is not stored yet", async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.stripe.com/v1/customers");
    assert.equal(init?.method, "POST");

    const body = new URLSearchParams(String(init?.body ?? ""));
    assert.equal(body.get("email"), "sam@example.com");
    assert.equal(body.get("name"), "Sam Customer");
    assert.equal(body.get("metadata[userId]"), "user_123");

    return new Response(JSON.stringify({ id: "cus_test_123" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const customer = await ensureStripeCustomer({
    secretKey: "sk_test__123",
    email: "sam@example.com",
    name: "Sam Customer",
    metadata: { userId: "user_123" }
  });

  assert.deepEqual(customer, { id: "cus_test_123" });
});

test("ensureStripeCustomer recreates a deleted stored customer", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async (input, init) => {
    requestCount += 1;
    assert.equal(init?.method, "POST");

    if (requestCount === 1) {
      assert.equal(String(input), "https://api.stripe.com/v1/customers/cus_deleted_123");
      return new Response(JSON.stringify({ error: { message: "No such customer" } }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    assert.equal(String(input), "https://api.stripe.com/v1/customers");
    const body = new URLSearchParams(String(init?.body ?? ""));
    assert.equal(body.get("email"), "sam@example.com");
    assert.equal(body.get("metadata[userId]"), "user_123");

    return new Response(JSON.stringify({ id: "cus_test_456" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const customer = await ensureStripeCustomer({
    secretKey: "sk_test__123",
    stripeCustomerId: "cus_deleted_123",
    email: "sam@example.com",
    name: "Sam Customer",
    metadata: { userId: "user_123" }
  });

  assert.deepEqual(customer, { id: "cus_test_456" });
  assert.equal(requestCount, 2);
});

test("isStripeCheckoutSessionPaid reflects Stripe payment_status", () => {
  assert.equal(isStripeCheckoutSessionPaid({ payment_status: "paid" }), true);
  assert.equal(isStripeCheckoutSessionPaid({ payment_status: "unpaid" }), false);
  assert.equal(isStripeCheckoutSessionPaid(null), false);
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
