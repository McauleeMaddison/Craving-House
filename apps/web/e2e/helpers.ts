import { expect, type Page } from "@playwright/test";

export const e2eAccounts = {
  customer: { email: "e2e.customer@cravinghouse.test", password: "CravingHouseE2E!" },
  staff: { email: "e2e.staff@cravinghouse.test", password: "CravingHouseE2E!" },
  manager: { email: "e2e.manager@cravinghouse.test", password: "CravingHouseE2E!" },
  reset: { email: "e2e.reset@cravinghouse.test", password: "CravingHouseE2E!" }
} as const;

async function waitForSessionCookie(page: Page) {
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).some(
          (cookie) =>
            cookie.name === "next-auth.session-token" ||
            cookie.name === "__Secure-next-auth.session-token" ||
            cookie.name.endsWith(".session-token")
        ),
      { timeout: 10_000 }
    )
    .toBe(true);
}

export async function signIn(page: Page, params: { email: string; password: string; callbackUrl?: string }) {
  const callbackUrl = params.callbackUrl ?? "/";
  await page.goto(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByPlaceholder("Email").fill(params.email);
  await page.getByPlaceholder("Password").fill(params.password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await expect(page).not.toHaveURL(/\/signin/);
  await waitForSessionCookie(page);
  await page.goto(callbackUrl);
}

export async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export async function addFirstMenuItemToCart(page: Page) {
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
}
