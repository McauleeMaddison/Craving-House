import assert from "node:assert/strict";
import test from "node:test";

import { canAccessBoilerBuster } from "./boiler-buster-access.ts";

test("canAccessBoilerBuster allows guests and customers", () => {
  assert.equal(canAccessBoilerBuster(undefined), true);
  assert.equal(canAccessBoilerBuster(null), true);
  assert.equal(canAccessBoilerBuster("customer"), true);
});

test("canAccessBoilerBuster blocks staff and manager roles", () => {
  assert.equal(canAccessBoilerBuster("staff"), false);
  assert.equal(canAccessBoilerBuster("manager"), false);
});
