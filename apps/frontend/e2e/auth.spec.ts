import { expect, test } from "@playwright/test"

import { signIn } from "./signIn"

test("signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/quacks")

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
})

test("user can sign in", async ({ page }) => {
  await signIn(page, "caffeinatedduck@example.com", "password1")

  await page.goto("/quacks")
  await expect(page.getByRole("heading", { name: "Quacks", level: 1 })).toBeVisible()
})
