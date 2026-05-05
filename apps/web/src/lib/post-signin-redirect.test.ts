import assert from "node:assert/strict";
import test from "node:test";

import { resolvePostSignInRedirect } from "./post-signin-redirect.ts";

test("manager always redirects to manager portal", () => {
  assert.equal(
    resolvePostSignInRedirect({ role: "manager", resultUrl: "/staff", callbackUrl: "/staff/orders" }),
    "/manager"
  );
});

test("staff always redirects to staff portal", () => {
  assert.equal(resolvePostSignInRedirect({ role: "staff", resultUrl: "/orders" }), "/staff");
});

test("customer uses auth result url when available", () => {
  assert.equal(resolvePostSignInRedirect({ role: "customer", resultUrl: "/orders/123", callbackUrl: "/menu" }), "/orders/123");
});

test("customer falls back to callback url, then root", () => {
  assert.equal(resolvePostSignInRedirect({ role: "customer", callbackUrl: "/menu" }), "/menu");
  assert.equal(resolvePostSignInRedirect({ role: "customer", callbackUrl: "https://example.com/unsafe" }), "/");
});

test("invalid roles fall back to customer behavior", () => {
  assert.equal(resolvePostSignInRedirect({ role: "owner", callbackUrl: "/menu" }), "/menu");
});
