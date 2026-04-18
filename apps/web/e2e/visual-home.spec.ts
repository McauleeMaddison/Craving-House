import { expect, test } from "@playwright/test";

test("home shell visual regression - mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".dashHero")).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });

  await expect(page).toHaveScreenshot("home-shell-mobile.png", {
    fullPage: true,
    animations: "disabled",
    maxDiffPixelRatio: 0.04
  });
});

test("home shell visual regression - desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.locator(".dashHero")).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });

  await expect(page).toHaveScreenshot("home-shell-desktop.png", {
    fullPage: true,
    animations: "disabled",
    maxDiffPixelRatio: 0.04
  });
});
