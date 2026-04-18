import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/visual-*.spec.ts",
  timeout: 90_000,
  outputDir: "./test-results/visual",
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  // Keep snapshot names stable across environments.
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    ...devices["Pixel 5"],
    browserName: "chromium",
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off"
  },
  webServer: {
    command: "E2E_FAKE_STRIPE=true npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 180_000
  }
});
