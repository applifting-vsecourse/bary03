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

test("moderator can delete someone else's quack", async ({ browser, page }) => {
  // CaffeinatedDuck posts the quack the moderator deletes, so the test never
  // removes seeded data.
  const authorContext = await browser.newContext()
  const authorPage = await authorContext.newPage()
  await signIn(authorPage, "caffeinatedduck@example.com", "password1")
  const text = `Moderate me ${Date.now()}`
  const created = await authorPage.request.post(`${API_URL}/quacks`, { data: { text } })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()) as { id: string }

  try {
    await signIn(page, "admin@example.com", "adminpassword")
    await page.goto("/quacks")

    const item = page.getByRole("article").filter({ hasText: text })
    await item.getByRole("button", { name: "Delete quack" }).click()
    const dialog = page.getByRole("alertdialog", { name: "Delete Caffeinated Duck's quack?" })
    await expect(dialog).toContainText("You're deleting it as a moderator.")
    await dialog.getByRole("button", { name: "Delete", exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText(text)).toHaveCount(0)
    // gone on the server too, for the author as well
    const feed = (await (await authorPage.request.get(`${API_URL}/quacks`)).json()) as {
      id: string
    }[]
    expect(feed.map((quack) => quack.id)).not.toContain(id)
  } finally {
    await authorPage.request.delete(`${API_URL}/quacks/${id}`)
    await authorContext.close()
  }
})

test("anyone can reply to a quack and see the count go up", async ({ browser, page }) => {
  // CaffeinatedDuck posts the quack DeepDuckThoughts replies to, so the test
  // never touches seeded data.
  const authorContext = await browser.newContext()
  const authorPage = await authorContext.newPage()
  await signIn(authorPage, "caffeinatedduck@example.com", "password1")
  const text = `Reply to me ${Date.now()}`
  const created = await authorPage.request.post(`${API_URL}/quacks`, { data: { text } })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()) as { id: string }
  const replyText = `E2E reply ${Date.now()}`
  let replyId: string | undefined

  try {
    await signIn(page, "deepduckthoughts@example.com", "password2")
    await page.goto("/quacks")
    const item = page.getByRole("article").filter({ hasText: text })

    await item.getByRole("button", { name: "Reply", exact: true }).click()
    await item.getByRole("button", { name: "Post reply" }).click()
    await expect(item.getByText("Reply can't be empty — write something first.")).toBeVisible()

    await item.getByLabel("Your reply").fill(replyText)
    const posted = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/quacks/${id}/replies`) && response.request().method() === "POST",
    )
    await item.getByRole("button", { name: "Post reply" }).click()
    const response = await posted
    expect(response.status()).toBe(201)
    replyId = ((await response.json()) as { id: string }).id

    await expect(item.getByRole("button", { name: "1 reply" })).toBeVisible()
    await expect(item.getByLabel("Your reply")).toHaveValue("")
    const shown = item.getByRole("list", { name: "Replies" }).getByRole("listitem")
    await expect(shown).toHaveCount(1)
    await expect(shown).toContainText(replyText)
    await expect(shown).toContainText("@DeepDuckThoughts")
    // A reply is never a feed item of its own: the only article showing it
    // is the quack it answers, and the feed doesn't list it.
    const showingReply = page.getByRole("article").filter({ hasText: replyText })
    await expect(showingReply).toHaveCount(1)
    await expect(showingReply).toContainText(text)
    const feed = (await (await page.request.get(`${API_URL}/quacks`)).json()) as { id: string }[]
    expect(feed.map((quack) => quack.id)).not.toContain(replyId)
  } finally {
    // A reply is a quack: delete it first, or the quack it answers can't go.
    if (replyId) await page.request.delete(`${API_URL}/quacks/${replyId}`)
    await authorPage.request.delete(`${API_URL}/quacks/${id}`)
    await authorContext.close()
  }
})

test("opening the replies shows them under the quack, oldest first", async ({ browser, page }) => {
  // CaffeinatedDuck posts the quack and the first reply, DeepDuckThoughts the
  // second, so the test never touches seeded data.
  const authorContext = await browser.newContext()
  const authorPage = await authorContext.newPage()
  await signIn(authorPage, "caffeinatedduck@example.com", "password1")
  await signIn(page, "deepduckthoughts@example.com", "password2")
  const stamp = Date.now()
  const text = `Read my replies ${stamp}`
  const created = await authorPage.request.post(`${API_URL}/quacks`, { data: { text } })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()) as { id: string }
  const replyIds: string[] = []
  const postReply = async (from: typeof page, replyText: string) => {
    const response = await from.request.post(`${API_URL}/quacks/${id}/replies`, {
      data: { text: replyText },
    })
    expect(response.status()).toBe(201)
    replyIds.push(((await response.json()) as { id: string }).id)
  }

  try {
    await postReply(authorPage, `First reply ${stamp}`)
    await postReply(page, `Second reply ${stamp}`)

    await page.goto("/quacks")
    const item = page.getByRole("article").filter({ hasText: text })
    await item.getByRole("button", { name: "2 replies" }).click()

    const shown = item.getByRole("list", { name: "Replies" }).getByRole("listitem")
    await expect(shown).toHaveCount(2)
    await expect(shown.nth(0)).toContainText(`First reply ${stamp}`)
    await expect(shown.nth(0)).toContainText("Caffeinated Duck")
    await expect(shown.nth(0)).toContainText("@CaffeinatedDuck")
    await expect(shown.nth(0).locator("time")).toHaveText(/\d{2}-\d{2}-\d{4} \d{1,2}:\d{2}/)
    await expect(shown.nth(1)).toContainText(`Second reply ${stamp}`)
    await expect(shown.nth(1)).toContainText("@DeepDuckThoughts")
    await expect(item.getByLabel("Your reply")).toBeVisible()
  } finally {
    // Each reply by its own author, then the quack they answer.
    if (replyIds[0]) await authorPage.request.delete(`${API_URL}/quacks/${replyIds[0]}`)
    if (replyIds[1]) await page.request.delete(`${API_URL}/quacks/${replyIds[1]}`)
    await authorPage.request.delete(`${API_URL}/quacks/${id}`)
    await authorContext.close()
  }
})
