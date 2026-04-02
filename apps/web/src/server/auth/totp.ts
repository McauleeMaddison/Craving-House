import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number) {
  const ctr = Buffer.alloc(8);
  ctr.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac("sha1", secret).update(ctr).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

export function generateTotpSecretBase32() {
  const secret = crypto.randomBytes(20);
  return base32Encode(secret);
}

export function verifyTotp(params: { secretBase32: string; token: string; stepSeconds?: number; window?: number }) {
  const token = params.token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return false;

  const step = params.stepSeconds ?? 30;
  const window = params.window ?? 1;
  const secret = base32Decode(params.secretBase32);
  if (!secret.length) return false;

  const counter = Math.floor(Date.now() / 1000 / step);
  for (let w = -window; w <= window; w++) {
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, counter + w)), Buffer.from(token))) return true;
  }
  return false;
}

export function buildTotpAuthUrl(params: { issuer: string; accountLabel: string; secretBase32: string }) {
  const issuer = params.issuer.trim();
  const label = `${issuer}:${params.accountLabel}`.trim();
  const url =
    `otpauth://totp/${encodeURIComponent(label)}` +
    `?secret=${encodeURIComponent(params.secretBase32)}` +
    `&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1&digits=6&period=30`;
  return url;
}

