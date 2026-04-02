import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { decryptSecret, encryptSecret } from "./secret-box.ts";

function makeLegacyBox(plaintext: string, keyMaterial: string) {
  const key = crypto.createHash("sha256").update(keyMaterial, "utf8").digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

test("encryptSecret and decryptSecret require and use MFA_ENCRYPTION_KEY", async (t) => {
  const previousKey = process.env.MFA_ENCRYPTION_KEY;
  const previousNextAuthSecret = process.env.NEXTAUTH_SECRET;

  process.env.MFA_ENCRYPTION_KEY = "mfa-secret-key";
  process.env.NEXTAUTH_SECRET = "nextauth-secret";

  t.after(() => {
    process.env.MFA_ENCRYPTION_KEY = previousKey;
    process.env.NEXTAUTH_SECRET = previousNextAuthSecret;
  });

  const box = encryptSecret("ABC123");
  assert.equal(decryptSecret(box), "ABC123");
});

test("decryptSecret can still read legacy boxes encrypted with NEXTAUTH_SECRET", async (t) => {
  const previousKey = process.env.MFA_ENCRYPTION_KEY;
  const previousNextAuthSecret = process.env.NEXTAUTH_SECRET;

  process.env.MFA_ENCRYPTION_KEY = "new-mfa-secret";
  process.env.NEXTAUTH_SECRET = "legacy-nextauth-secret";

  t.after(() => {
    process.env.MFA_ENCRYPTION_KEY = previousKey;
    process.env.NEXTAUTH_SECRET = previousNextAuthSecret;
  });

  const legacyBox = makeLegacyBox("legacy-value", "legacy-nextauth-secret");
  assert.equal(decryptSecret(legacyBox), "legacy-value");
});
