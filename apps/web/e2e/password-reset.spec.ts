import { expect, test } from "@playwright/test";

import { e2eAccounts, signIn } from "./helpers";

test("password reset can complete locally via the debug reset link", async ({ page }) => {
  const nextPassword = `Reset${Date.now()}!`;

  await page.goto("/reset-password");
  await page.getByLabel("Email").fill(e2eAccounts.reset.email);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByText("If that email can be reset, we'll send a link shortly.")).toBeVisible();
  await page.getByRole("link", { name: "Open debug reset link" }).click();

  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill(nextPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(page.getByText("Your password has been reset. You can sign in with the new password now.")).toBeVisible();

  await signIn(page, {
    email: e2eAccounts.reset.email,
    password: nextPassword,
    callbackUrl: "/orders"
  });
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
});
