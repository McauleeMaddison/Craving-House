import assert from "node:assert/strict";
import test from "node:test";

import { shouldRedirectStaffToPortal } from "./staff-route-guard.ts";

test("staff route guard allows staff portal routes", () => {
  assert.equal(shouldRedirectStaffToPortal("/staff"), false);
  assert.equal(shouldRedirectStaffToPortal("/staff/orders"), false);
  assert.equal(shouldRedirectStaffToPortal("/staff/loyalty-scan"), false);
});

test("staff route guard allows api routes used by the portal", () => {
  assert.equal(shouldRedirectStaffToPortal("/api/auth/session"), false);
  assert.equal(shouldRedirectStaffToPortal("/api/staff/orders"), false);
  assert.equal(shouldRedirectStaffToPortal("/api/engagement/loyalty/stamp"), false);
});

test("staff route guard redirects staff away from customer and manager pages", () => {
  assert.equal(shouldRedirectStaffToPortal("/"), true);
  assert.equal(shouldRedirectStaffToPortal("/menu"), true);
  assert.equal(shouldRedirectStaffToPortal("/orders"), true);
  assert.equal(shouldRedirectStaffToPortal("/manager"), true);
  assert.equal(shouldRedirectStaffToPortal("/manager/users"), true);
  assert.equal(shouldRedirectStaffToPortal("/signin"), true);
});
