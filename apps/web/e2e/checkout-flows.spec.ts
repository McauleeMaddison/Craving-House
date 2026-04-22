import { expect, test } from "@playwright/test";

import { addFirstMenuItemToCart, clearSession, e2eAccounts, signIn } from "./helpers";

test("guest checkout requires an email and completes in fake Stripe mode", async ({ page }) => {
  const pickupName = `Guest E2E ${Date.now()}`;

  await addFirstMenuItemToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name for pickup").fill(pickupName);
  await page.getByRole("button", { name: /Continue to payment|Express pay/ }).click();
  await expect(page.getByText("Email is required for guest checkout.")).toBeVisible();

  await page.getByLabel("Email (for receipt + tracking)").fill("guest.e2e@example.com");
  await page.getByRole("button", { name: "Continue to payment" }).click();

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
  await page.getByRole("button", { name: /Continue to payment|Express pay/ }).click();

  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByText(pickupName)).toBeVisible();

  await clearSession(page);
  await signIn(page, { ...e2eAccounts.staff, callbackUrl: "/staff/orders" });
  await expect(page.getByRole("heading", { name: "Order queue" })).toBeVisible();
  await expect(page.getByText(pickupName)).toBeVisible();
});

test("critical flow: order -> pay -> loyalty scan -> redeem", async ({ page }) => {
  const pickupName = `Flow E2E ${Date.now()}`;

  await signIn(page, { ...e2eAccounts.customer, callbackUrl: "/" });
  await page.goto("/loyalty");
  await expect(page.getByRole("heading", { name: "Loyalty card" })).toBeVisible();

  const tokenValue = page.locator(".loyaltyTokenValue").first();
  await expect(tokenValue).toBeVisible();
  await expect.poll(async () => ((await tokenValue.textContent()) ?? "").trim()).not.toBe("—");
  const cardToken = ((await tokenValue.textContent()) ?? "").trim();
  expect(cardToken).toBeTruthy();

  await addFirstMenuItemToCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Name for pickup").fill(pickupName);
  await page.getByRole("button", { name: "Express pay" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByText(pickupName)).toBeVisible();

  await clearSession(page);
  await signIn(page, { ...e2eAccounts.staff, callbackUrl: "/staff/orders" });
  await expect(page.getByRole("heading", { name: "Order queue" })).toBeVisible();
  const orderCard = page.locator("article", { hasText: pickupName }).first();
  await expect(orderCard).toBeVisible();
  await orderCard.getByRole("button", { name: "Accept" }).click();

  await page.goto("/staff/loyalty-scan");
  await expect(page.getByRole("heading", { name: "Loyalty scan" })).toBeVisible();
  await page.getByPlaceholder("Paste scanned token").fill(cardToken);
  await page.getByLabel("Eligible coffees").fill("5");
  await page.getByRole("button", { name: "Add stamps" }).click();
  await expect(page.getByText("Stamped.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Redeem 1 free coffee" }).click();
  await expect(page.getByText("Redeemed 1 reward.", { exact: false })).toBeVisible();
});
