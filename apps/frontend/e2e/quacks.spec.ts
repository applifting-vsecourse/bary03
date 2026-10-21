import { expect, test } from "@playwright/test"

import { signIn } from "./signIn"

const API_URL = "http://localhost:4050/api"

test("author can post a quack and delete it", async ({ page }) => {
  const text = `E2E quack ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  await page.goto("/quacks")

  await page.getByLabel("New quack").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  const quack = page.getByRole("article").filter({ hasText: text })
  await expect(quack).toBeVisible()

  await quack.getByRole("button", { name: "Delete quack" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete this quack?" })
  await dialog.getByRole("button", { name: "Delete", exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText(text)).toHaveCount(0)
})

test("nobody can delete someone else's quack", async ({ browser, page }) => {
  // CaffeinatedDuck posts the quack DeepDuckThoughts will try to delete, so a
  // broken check only ever loses this test's own quack, never seeded data.
  const authorContext = await browser.newContext()
  const authorPage = await authorContext.newPage()
  await signIn(authorPage, "caffeinatedduck@example.com", "password1")
  const created = await authorPage.request.post(`${API_URL}/quacks`, {
    data: { text: `Not yours to delete ${Date.now()}` },
  })
  expect(created.status()).toBe(201)
  const quack = (await created.json()) as { id: string; text: string; user: { username: string } }
  expect(quack.user.username).not.toBe("DeepDuckThoughts")

  try {
    await signIn(page, "deepduckthoughts@example.com", "password2")
    await page.goto("/quacks")

    const item = page.getByRole("article").filter({ hasText: quack.text })
    await expect(item).toBeVisible()
    await expect(item.getByRole("button", { name: "Delete quack" })).toHaveCount(0)

    // Straight to the API with DeepDuckThoughts' session cookie.
    const response = await page.request.delete(`${API_URL}/quacks/${quack.id}`)
    expect(response.status()).toBe(403)
  } finally {
    await authorPage.request.delete(`${API_URL}/quacks/${quack.id}`)
    await authorContext.close()
  }
})
