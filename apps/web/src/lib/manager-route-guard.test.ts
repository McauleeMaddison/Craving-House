import assert from "node:assert/strict";
import test from "node:test";

import { shouldRedirectManagerToPortal } from "./manager-route-guard.ts";

test("manager route guard allows manager portal routes", () => {
  assert.equal(shouldRedirectManagerToPortal("/manager"), false);
  assert.equal(shouldRedirectManagerToPortal("/manager/orders"), false);
  assert.equal(shouldRedirectManagerToPortal("/manager/users"), false);
});

test("manager route guard allows api routes used by the portal", () => {
  assert.equal(shouldRedirectManagerToPortal("/api/auth/session"), false);
  assert.equal(shouldRedirectManagerToPortal("/api/staff/orders"), false);
  assert.equal(shouldRedirectManagerToPortal("/api/manager/orders"), false);
});

test("manager route guard redirects managers away from customer and staff pages", () => {
  assert.equal(shouldRedirectManagerToPortal("/"), true);
  assert.equal(shouldRedirectManagerToPortal("/menu"), true);
  assert.equal(shouldRedirectManagerToPortal("/orders"), true);
  assert.equal(shouldRedirectManagerToPortal("/staff"), true);
  assert.equal(shouldRedirectManagerToPortal("/staff/orders"), true);
  assert.equal(shouldRedirectManagerToPortal("/signin"), true);
});
