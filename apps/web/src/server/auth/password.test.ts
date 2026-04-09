import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, passwordHashNeedsRehash, validatePasswordForSignup, verifyPassword } from "./password.ts";

test("hashPassword uses the stronger scrypt parameters and verifyPassword accepts the result", async () => {
  const stored = await hashPassword("correct horse battery staple");

  assert.match(stored, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await verifyPassword({ password: "correct horse battery staple", stored }), true);
  assert.equal(passwordHashNeedsRehash(stored), false);
});

test("passwordHashNeedsRehash flags older hashes", () => {
  const legacy =
    "scrypt$16384$8$1$" +
    Buffer.alloc(16, 5).toString("base64url") +
    "$" +
    Buffer.alloc(64, 7).toString("base64url");
  assert.equal(passwordHashNeedsRehash(legacy), true);
});

test("validatePasswordForSignup requires at least 9 characters", () => {
  assert.equal(validatePasswordForSignup("short"), "Password must be at least 9 characters.");
  assert.equal(validatePasswordForSignup("long enough password"), null);
});
