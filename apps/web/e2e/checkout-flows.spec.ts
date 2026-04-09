import { expect, test } from "@playwright/test";

import { addFirstMenuItemToCart, clearSession, e2eAccounts, signIn } from "./helpers";

test("guest checkout requires an email and completes in fake Stripe mode", async ({ page }) => {
  const pickupName = `Guest E2E ${Date.now()}`;

  await addFirstMenuItemToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name for pickup").fill(pickupName);
  await page.getByRole("button", { name: "Pay now" }).click();
  await expect(page.getByText("Email is required for guest checkout.")).toBeVisible();

  await page.getByLabel("Email (for receipt + tracking)").fill("guest.e2e@example.com");
  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(page).toHaveURL(/\/orders\/guest\//);
  await expect(page.getByText(pickupName)).toBeVisible();
});

test("signed-in customer can place an order and staff can see it", async ({ page }) => {
  const pickupName = `Signed In E2E ${Date.now()}`;

  await signIn(page, { ...e2eAccounts.customer, callbackUrl: "/" });
  await page.goto("/loyalty");
  await expect(page.getByRole("heading", { name: "Loyalty card" })).toBeVisible();

  await addFirstMenuItemToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name for pickup").fill(pickupName);
  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByText(pickupName)).toBeVisible();

  await clearSession(page);
  await signIn(page, { ...e2eAccounts.staff, callbackUrl: "/staff/orders" });
  await expect(page.getByRole("heading", { name: "Order queue" })).toBeVisible();
  await expect(page.getByText(pickupName)).toBeVisible();
});
