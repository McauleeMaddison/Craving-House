import { expect, test } from "@playwright/test";

import { clearSession, e2eAccounts, signIn } from "./helpers";

test("customer sign-in loads loyalty and blocks staff/manager portals", async ({ page }) => {
  await signIn(page, { ...e2eAccounts.customer, callbackUrl: "/" });

  await page.goto("/loyalty");
  await expect(page.getByRole("heading", { name: "Loyalty card" })).toBeVisible();
  await expect(page.getByText(/Signed in as/i)).toBeVisible();

  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  await page.goto("/staff");
  await expect(page.getByText("You don’t have staff access.")).toBeVisible();

  await page.goto("/manager");
  await expect(page.getByText("You don’t have manager access.")).toBeVisible();
});

test("staff can access queue tools but not manager pages", async ({ page }) => {
  await signIn(page, { ...e2eAccounts.staff, callbackUrl: "/staff" });

  await expect(page.getByRole("heading", { name: "Staff dashboard" })).toBeVisible();

  await page.goto("/staff/orders");
  await expect(page.getByRole("heading", { name: "Order queue" })).toBeVisible();

  await page.goto("/staff/loyalty-scan");
  await expect(page.getByRole("heading", { name: "Loyalty scan" })).toBeVisible();

  await page.goto("/manager");
  await expect(page.getByText("You don’t have manager access.")).toBeVisible();
});

test("manager can access manager tools and staff tools", async ({ page }) => {
  await signIn(page, { ...e2eAccounts.manager, callbackUrl: "/manager" });

  await expect(page.getByRole("heading", { name: "Manager dashboard" })).toBeVisible();

  await page.goto("/manager/users");
  await expect(page.getByRole("heading", { name: "Users & roles" })).toBeVisible();
  await page.locator("select").first().selectOption("customer");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("E2E Customer")).toBeVisible();

  await page.goto("/manager/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  await page.goto("/manager/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();

  await page.goto("/staff/orders");
  await expect(page.getByRole("heading", { name: "Order queue" })).toBeVisible();

  await clearSession(page);
});
