import assert from "node:assert/strict";
import test from "node:test";

import { getOperationsAlertConfig } from "./alerts.ts";

test("getOperationsAlertConfig requires an alert email and smtp config", () => {
  assert.deepEqual(getOperationsAlertConfig({ OPERATIONS_ALERT_EMAIL: "" }), {
    cooldownSeconds: 300,
    emailTo: null,
    emailEnabled: false,
    enabled: false,
    webhookUrl: null
  });
});

test("getOperationsAlertConfig normalizes webhook config and cooldown", () => {
  assert.deepEqual(
    getOperationsAlertConfig({
      OPERATIONS_ALERT_EMAIL: "",
      OPERATIONS_ALERT_WEBHOOK_URL: " https://hooks.example.test/ops ",
      OPERATIONS_ALERT_COOLDOWN_SECONDS: "45"
    }),
    {
      cooldownSeconds: 60,
      emailTo: null,
      emailEnabled: false,
      enabled: true,
      webhookUrl: "https://hooks.example.test/ops"
    }
  );
});
