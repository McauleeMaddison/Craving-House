import crypto from "node:crypto";

function getKeyMaterial() {
  const explicit = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (explicit) return explicit;
  const fallback = process.env.NEXTAUTH_SECRET?.trim();
  if (fallback) return fallback;
  throw new Error("Missing MFA_ENCRYPTION_KEY (or NEXTAUTH_SECRET) for encrypting MFA secrets");
}

function deriveKey() {
  return crypto.createHash("sha256").update(getKeyMaterial(), "utf8").digest(); // 32 bytes
}

export function encryptSecret(plaintext: string) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(box: string) {
  const parts = box.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid secret box");
  const iv = Buffer.from(parts[1], "base64url");
  const ciphertext = Buffer.from(parts[2], "base64url");
  const tag = Buffer.from(parts[3], "base64url");

  const key = deriveKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

