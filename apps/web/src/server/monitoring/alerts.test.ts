import assert from "node:assert/strict";
import test from "node:test";

import { getOperationsAlertConfig } from "./alerts.ts";

test("getOperationsAlertConfig requires an alert email and smtp config", () => {
  assert.deepEqual(getOperationsAlertConfig({ OPERATIONS_ALERT_EMAIL: "" }), {
    emailTo: null,
    enabled: false
  });
});
