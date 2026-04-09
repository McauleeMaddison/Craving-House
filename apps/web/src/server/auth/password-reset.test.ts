import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  getPasswordResetIdentifier,
  getPasswordResetExpiry,
  getPasswordResetTtlMinutes,
  hashPasswordResetToken,
  isReasonablePasswordResetEmail,
  normalizePasswordResetEmail
} from "./password-reset.ts";

test("normalizePasswordResetEmail trims and lowercases emails", () => {
  assert.equal(normalizePasswordResetEmail("  TEST@Example.com "), "test@example.com");
});

test("isReasonablePasswordResetEmail applies basic validation", () => {
  assert.equal(isReasonablePasswordResetEmail("a@b"), true);
  assert.equal(isReasonablePasswordResetEmail("missing-at"), false);
  assert.equal(isReasonablePasswordResetEmail(""), false);
});

test("getPasswordResetIdentifier namespaces the email", () => {
  assert.equal(getPasswordResetIdentifier("Test@example.com"), "password-reset:test@example.com");
});

test("createPasswordResetToken returns non-empty random-looking values", () => {
  const a = createPasswordResetToken();
  const b = createPasswordResetToken();
  assert.equal(typeof a, "string");
  assert.equal(typeof b, "string");
  assert.notEqual(a, b);
  assert.ok(a.length >= 20);
});

test("hashPasswordResetToken is deterministic", () => {
  assert.equal(
    hashPasswordResetToken("sample-token"),
    "0f35d0ae14518b96bd6d3fec3ca15801fd58c9e048b1ccdea11a71378f2acdc9"
  );
});

test("getPasswordResetTtlMinutes clamps env values to safe bounds", () => {
  assert.equal(getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: undefined }), 30);
  assert.equal(getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: "4" }), 5);
  assert.equal(getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: "45" }), 45);
  assert.equal(getPasswordResetTtlMinutes({ PASSWORD_RESET_TOKEN_TTL_MINUTES: "5000" }), 1440);
});

test("getPasswordResetExpiry uses the ttl in minutes", () => {
  const now = new Date("2026-04-09T10:00:00.000Z");
  assert.equal(getPasswordResetExpiry(now, 30).toISOString(), "2026-04-09T10:30:00.000Z");
});

test("buildPasswordResetUrl builds a reset page link", () => {
  assert.equal(
    buildPasswordResetUrl({
      email: "customer@example.com",
      token: "abc123",
      requestOrigin: "https://cravinghouse.test"
    }),
    "https://cravinghouse.test/reset-password?email=customer%40example.com&token=abc123"
  );
});
