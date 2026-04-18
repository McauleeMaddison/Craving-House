import crypto from "node:crypto";

const STRIPE_API_VERSION = "2026-02-25.clover";

type StripeRuntimeEnv = Partial<Pick<NodeJS.ProcessEnv, "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "STRIPE_WEBHOOK_IP_ALLOWLIST">>;

type StripeCreateSessionParams = {
  secretKey: string;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  customerId?: string | null;
  allowSavedPaymentMethods?: boolean;
  allowBankTransfers?: boolean;
  preferExpressWallets?: boolean;
  lineItems: Array<{ name: string; unitAmountCents: number; qty: number }>;
};

type StripeEnsureCustomerParams = {
  secretKey: string;
  stripeCustomerId?: string | null;
  email?: string | null;
  name?: string | null;
  metadata?: Record<string, string | null | undefined>;
};

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function getStripeRuntimeConfig(env?: StripeRuntimeEnv) {
  const runtimeEnv = env ?? {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_WEBHOOK_IP_ALLOWLIST: process.env.STRIPE_WEBHOOK_IP_ALLOWLIST
  };

  const secretKey = normalizeEnvValue(runtimeEnv.STRIPE_SECRET_KEY);
  const webhookSecret = normalizeEnvValue(runtimeEnv.STRIPE_WEBHOOK_SECRET);
  const webhookIpAllowlist = normalizeEnvValue(runtimeEnv.STRIPE_WEBHOOK_IP_ALLOWLIST)
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];

  const mode = secretKey?.startsWith("sk_live_")
    ? "live"
    : secretKey?.startsWith("sk_test_")
      ? "test"
      : secretKey
        ? "unknown"
        : "unset";

  return {
    secretKey,
    webhookSecret,
    webhookIpAllowlist,
    enabled: Boolean(secretKey && webhookSecret),
    mode
  } as const;
}

function clampName(input: string) {
  const name = input.trim().replace(/\s+/g, " ");
  return name.length > 120 ? `${name.slice(0, 117)}...` : name;
}

function toStripeCurrencyAmount(cents: number) {
  return Math.max(0, Math.round(cents));
}

function formEncode(pairs: Array<[string, string]>) {
  const params = new URLSearchParams();
  for (const [k, v] of pairs) params.append(k, v);
  return params.toString();
}

class StripeRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StripeRequestError";
    this.status = status;
  }
}

async function stripeFormPost(path: string, secretKey: string, pairs: Array<[string, string]>) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "stripe-version": STRIPE_API_VERSION,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: formEncode(pairs)
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = json?.error?.message || "Stripe error";
    throw new StripeRequestError(msg, res.status);
  }

  return json;
}

function normalizePersonName(input: string | null | undefined) {
  const name = input?.trim().replace(/\s+/g, " ") ?? "";
  return name.length > 0 ? name : null;
}

function appendMetadataPairs(pairs: Array<[string, string]>, metadata: Record<string, string | null | undefined> | undefined) {
  if (!metadata) return;
  for (const [key, rawValue] of Object.entries(metadata)) {
    const trimmedKey = key.trim();
    const value = rawValue?.trim();
    if (!trimmedKey || !value) continue;
    pairs.push([`metadata[${trimmedKey}]`, value]);
  }
}

export async function ensureStripeCustomer(params: StripeEnsureCustomerParams): Promise<{ id: string }> {
  const pairs: Array<[string, string]> = [];
  const email = normalizeEnvValue(params.email ?? undefined);
  const name = normalizePersonName(params.name);

  if (email) pairs.push(["email", email]);
  if (name) pairs.push(["name", name]);
  appendMetadataPairs(pairs, params.metadata);

  if (params.stripeCustomerId) {
    try {
      const customer = await stripeFormPost(`/v1/customers/${encodeURIComponent(params.stripeCustomerId)}`, params.secretKey, pairs);
      if (!customer?.id) throw new Error("Invalid Stripe customer response");
      return { id: String(customer.id) };
    } catch (error) {
      if (!(error instanceof StripeRequestError) || error.status !== 404) {
        throw error;
      }
    }
  }

  const customer = await stripeFormPost("/v1/customers", params.secretKey, pairs);
  if (!customer?.id) throw new Error("Invalid Stripe customer response");
  return { id: String(customer.id) };
}

export async function createStripeCheckoutSession(params: StripeCreateSessionParams): Promise<{ id: string; url: string }> {
  const pairs: Array<[string, string]> = [
    ["mode", "payment"],
    ["currency", "gbp"],
    ["success_url", params.successUrl],
    ["cancel_url", params.cancelUrl],
    ["client_reference_id", params.orderId],
    ["metadata[orderId]", params.orderId],
    ["payment_intent_data[metadata][orderId]", params.orderId]
  ];

  if (params.preferExpressWallets) {
    // Lets returning customers skip unnecessary payment detail collection when possible.
    pairs.push(["payment_method_collection", "if_required"]);
  }

  if (params.allowBankTransfers) {
    pairs.push(["payment_method_types[0]", "card"]);
    pairs.push(["payment_method_types[1]", "customer_balance"]);
    pairs.push(["payment_method_options[customer_balance][funding_type]", "bank_transfer"]);
    pairs.push(["payment_method_options[customer_balance][bank_transfer][type]", "gb_bank_transfer"]);
  }

  if (params.customerId) {
    pairs.push(["customer", params.customerId]);
    pairs.push(["customer_update[name]", "auto"]);

    if (params.allowSavedPaymentMethods) {
      pairs.push(["saved_payment_method_options[payment_method_save]", "enabled"]);
      pairs.push(["saved_payment_method_options[payment_method_remove]", "enabled"]);
    }
  } else if (params.customerEmail) {
    pairs.push(["customer_email", params.customerEmail]);
  }

  params.lineItems.forEach((li, idx) => {
    const i = String(idx);
    pairs.push([`line_items[${i}][quantity]`, String(Math.max(1, li.qty))]);
    pairs.push([`line_items[${i}][price_data][currency]`, "gbp"]);
    pairs.push([`line_items[${i}][price_data][unit_amount]`, String(toStripeCurrencyAmount(li.unitAmountCents))]);
    pairs.push([`line_items[${i}][price_data][product_data][name]`, clampName(li.name)]);
  });

  const json = await stripeFormPost("/v1/checkout/sessions", params.secretKey, pairs);
  if (!json?.id || !json?.url) throw new Error("Invalid Stripe response");
  return { id: String(json.id), url: String(json.url) };
}

export function isStripeCheckoutSessionPaid(session: { payment_status?: unknown } | null | undefined) {
  return String(session?.payment_status ?? "") === "paid";
}

export function verifyStripeWebhook(params: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
  toleranceSeconds?: number;
}): { ok: true; event: any } | { ok: false; error: string } {
  const sig = params.signatureHeader;
  if (!sig) return { ok: false, error: "Missing Stripe-Signature header" };

  const parts = sig.split(",").map((s) => s.trim());
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1="));
  if (!timestampPart || v1Parts.length === 0) return { ok: false, error: "Invalid signature header" };

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return { ok: false, error: "Invalid timestamp" };

  const tolerance = params.toleranceSeconds ?? 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) return { ok: false, error: "Timestamp outside tolerance" };

  const signedPayload = `${timestamp}.${params.rawBody}`;
  const expected = crypto
    .createHmac("sha256", params.webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const matches = v1Parts.some((p) => {
    const candidate = p.slice(3);
    if (!candidate || candidate.length !== expected.length) return false;
    try {
      const candBuf = Buffer.from(candidate, "hex");
      return candBuf.length === expectedBuf.length && crypto.timingSafeEqual(candBuf, expectedBuf);
    } catch {
      return false;
    }
  });

  if (!matches) return { ok: false, error: "Signature mismatch" };

  try {
    const event = JSON.parse(params.rawBody);
    return { ok: true, event };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

export function isStripeWebhookIpAllowed(params: { ip: string; allowlist: string[] }) {
  if (params.allowlist.length === 0) return true;
  const candidate = params.ip.trim();
  if (!candidate) return false;
  return params.allowlist.includes(candidate);
}
