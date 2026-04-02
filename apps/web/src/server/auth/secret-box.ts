import crypto from "node:crypto";

function getPrimaryKeyMaterial() {
  const explicit = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (!explicit) {
    throw new Error("Missing MFA_ENCRYPTION_KEY for encrypting MFA secrets");
  }
  return explicit;
}

function getLegacyKeyMaterial() {
  return process.env.NEXTAUTH_SECRET?.trim() || null;
}

function deriveKey(material: string) {
  return crypto.createHash("sha256").update(material, "utf8").digest(); // 32 bytes
}

function decryptWithKey(box: string, key: Buffer) {
  const parts = box.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid secret box");
  const iv = Buffer.from(parts[1], "base64url");
  const ciphertext = Buffer.from(parts[2], "base64url");
  const tag = Buffer.from(parts[3], "base64url");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function encryptSecret(plaintext: string) {
  const key = deriveKey(getPrimaryKeyMaterial());
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(box: string) {
  const primaryKey = deriveKey(getPrimaryKeyMaterial());
  try {
    return decryptWithKey(box, primaryKey);
  } catch (error) {
    const legacyMaterial = getLegacyKeyMaterial();
    const primaryMaterial = getPrimaryKeyMaterial();
    if (!legacyMaterial || legacyMaterial === primaryMaterial) throw error;
    return decryptWithKey(box, deriveKey(legacyMaterial));
  }
}
