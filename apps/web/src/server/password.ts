import crypto from "node:crypto";

type ScryptParams = {
  N: number;
  r: number;
  p: number;
};

const DEFAULT_PARAMS: ScryptParams = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;
const SALT_BYTES = 16;

function scrypt(password: string, salt: Buffer, keylen: number, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, params as crypto.ScryptOptions, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function parseStoredHash(stored: string): { params: ScryptParams; salt: Buffer; hash: Buffer } | null {
  const parts = stored.split("$");
  if (parts.length !== 6) return null;
  const [kind, nStr, rStr, pStr, saltStr, hashStr] = parts;
  if (kind !== "scrypt") return null;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return null;
  try {
    const salt = Buffer.from(saltStr, "base64url");
    const hash = Buffer.from(hashStr, "base64url");
    if (salt.length < 8 || hash.length < 16) return null;
    return { params: { N, r, p }, salt, hash };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, KEYLEN, DEFAULT_PARAMS);
  return ["scrypt", String(DEFAULT_PARAMS.N), String(DEFAULT_PARAMS.r), String(DEFAULT_PARAMS.p), b64url(salt), b64url(derived)].join(
    "$"
  );
}

export async function verifyPassword(params: { password: string; stored: string }): Promise<boolean> {
  const parsed = parseStoredHash(params.stored);
  if (!parsed) return false;
  const derived = await scrypt(params.password, parsed.salt, parsed.hash.length, parsed.params);
  return crypto.timingSafeEqual(derived, parsed.hash);
}

export function validatePasswordForSignup(password: string): string | null {
  const trimmed = password.trim();
  if (trimmed.length < 10) return "Password must be at least 10 characters.";
  if (trimmed.length > 200) return "Password is too long.";
  return null;
}
