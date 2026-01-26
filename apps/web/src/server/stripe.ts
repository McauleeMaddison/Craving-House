import crypto from "node:crypto";

type StripeCreateSessionParams = {
  secretKey: string;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  lineItems: Array<{ name: string; unitAmountCents: number; qty: number }>;
};

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

export async function createStripeCheckoutSession(params: StripeCreateSessionParams): Promise<{ id: string; url: string }> {
  const pairs: Array<[string, string]> = [
    ["mode", "payment"],
    ["currency", "gbp"],
    ["success_url", params.successUrl],
    ["cancel_url", params.cancelUrl],
    ["client_reference_id", params.orderId],
    ["metadata[orderId]", params.orderId]
  ];

  if (params.customerEmail) {
    pairs.push(["customer_email", params.customerEmail]);
  }

  params.lineItems.forEach((li, idx) => {
    const i = String(idx);
    pairs.push([`line_items[${i}][quantity]`, String(Math.max(1, li.qty))]);
    pairs.push([`line_items[${i}][price_data][currency]`, "gbp"]);
    pairs.push([`line_items[${i}][price_data][unit_amount]`, String(toStripeCurrencyAmount(li.unitAmountCents))]);
    pairs.push([`line_items[${i}][price_data][product_data][name]`, clampName(li.name)]);
  });

  const body = formEncode(pairs);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.secretKey}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg = json?.error?.message || "Stripe error";
    throw new Error(msg);
  }

  if (!json?.id || !json?.url) throw new Error("Invalid Stripe response");
  return { id: String(json.id), url: String(json.url) };
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
