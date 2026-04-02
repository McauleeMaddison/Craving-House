import crypto from "node:crypto";

type CustomerQrPayload = {
  userId: string;
  exp: number;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createCustomerQrToken(params: {
  userId: string;
  ttlSeconds: number;
  secret: string;
}): string {
  const payload: CustomerQrPayload = {
    userId: params.userId,
    exp: Math.floor(Date.now() / 1000) + params.ttlSeconds
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(body, params.secret);
  return `${body}.${sig}`;
}

export function verifyCustomerQrToken(params: {
  token: string;
  secret: string;
}): { userId: string } {
  const [body, sig] = params.token.split(".", 2);
  if (!body || !sig) throw new Error("Invalid token format");
  const expected = sign(body, params.secret);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("Invalid token signature");
  }
  const parsed = JSON.parse(base64UrlDecode(body)) as CustomerQrPayload;
  if (!parsed.userId || !Number.isFinite(parsed.exp)) throw new Error("Invalid token payload");
  if (Math.floor(Date.now() / 1000) > parsed.exp) throw new Error("Token expired");
  return { userId: parsed.userId };
}

