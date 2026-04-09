import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  outputDir: "./test-results",
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Pixel 5"],
    browserName: "chromium",
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "npm run e2e:prepare && E2E_FAKE_STRIPE=true npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 180_000
  }
});
