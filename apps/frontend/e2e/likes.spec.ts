import { expect, test, type Locator, type Page } from "@playwright/test"

import { signIn } from "./signIn"

// Likes, end to end (cases.md, section 3: E1–E4). Every test posts its own
// quack, so it never touches seeded data, and cleans up after itself.
const API_URL = "http://localhost:4050/api"

type Posted = { id: string }

const post = async (from: Page, path: string, data: object): Promise<Posted> => {
  const response = await from.request.post(`${API_URL}/${path}`, { data })
  expect(response.status()).toBe(201)
  return (await response.json()) as Posted
}

/** A quack's or reply's like button; its accessible name is "Like, <n> like(s)". */
const likeButtonIn = (scope: Locator) => scope.getByRole("button", { name: /^Like,/ })

/**
 * The quack's own like button, not those of the replies open under it: the
 * quack's comes first, above its replies.
 */
const quackLikeButton = (item: Locator) => likeButtonIn(item).first()

test("E1: like a quack, reload, take the like back", async ({ page }) => {
  await signIn(page, "caffeinatedduck@example.com", "password1")
  const text = `Like me ${Date.now()}`
  const quack = await post(page, "quacks", { text })

  try {
    await page.goto("/quacks")
    const item = page.getByRole("article").filter({ hasText: text })
    const button = likeButtonIn(item)
    await expect(button).toHaveAccessibleName("Like, 0 likes")
    await expect(button).toHaveAttribute("aria-pressed", "false")

    await button.click()
    await expect(button).toHaveAccessibleName("Like, 1 like")
    await expect(button).toHaveAttribute("aria-pressed", "true")

    await page.reload()
    await expect(button).toHaveAccessibleName("Like, 1 like")
    await expect(button).toHaveAttribute("aria-pressed", "true")

    await button.click()
    await expect(button).toHaveAccessibleName("Like, 0 likes")
    await expect(button).toHaveAttribute("aria-pressed", "false")

    await page.reload()
    await expect(button).toHaveAccessibleName("Like, 0 likes")
    await expect(button).toHaveAttribute("aria-pressed", "false")
  } finally {
    await page.request.delete(`${API_URL}/quacks/${quack.id}`)
  }
})

test("E2: a second user's like makes 2", async ({ browser, page }) => {
  const authorContext = await browser.newContext()
  const authorPage = await authorContext.newPage()
  await signIn(authorPage, "caffeinatedduck@example.com", "password1")
  const text = `Two likes please ${Date.now()}`
  const quack = await post(authorPage, "quacks", { text })

  try {
    // user A likes it first
    const liked = await authorPage.request.put(`${API_URL}/quacks/${quack.id}/like`)
    expect(liked.status()).toBe(204)

    await signIn(page, "deepduckthoughts@example.com", "password2")
    await page.goto("/quacks")
    const button = likeButtonIn(page.getByRole("article").filter({ hasText: text }))
    await expect(button).toHaveAccessibleName("Like, 1 like")
    await expect(button).toHaveAttribute("aria-pressed", "false")

    await button.click()
    await expect(button).toHaveAccessibleName("Like, 2 likes")
    await expect(button).toHaveAttribute("aria-pressed", "true")
  } finally {
    await authorPage.request.delete(`${API_URL}/quacks/${quack.id}`)
    await authorContext.close()
  }
})

test("E3: a like given with the replies open shows on the quack once they're closed", async ({
  page,
}) => {
  await signIn(page, "caffeinatedduck@example.com", "password1")
  const text = `Open my replies ${Date.now()}`
  const quack = await post(page, "quacks", { text })
  const reply = await post(page, `quacks/${quack.id}/replies`, { text: "first!" })

  try {
    await page.goto("/quacks")
    const item = page.getByRole("article").filter({ hasText: text })
    const repliesToggle = item.getByRole("button", { name: "1 reply" })
    await repliesToggle.click()
    await expect(item.getByRole("list", { name: "Replies" })).toBeVisible()

    // Fail any feed refetch, so only the app's own update can show the like.
    const feedRequest = /\/api\/quacks(\?[^/]*)?$/
    await page.route(feedRequest, (route) =>
      route.request().method() === "GET" ? route.abort() : route.fallback(),
    )
    // fails here, as an assertion, while the button doesn't exist yet
    await expect(quackLikeButton(item)).toBeVisible()
    await quackLikeButton(item).click()
    await repliesToggle.click()
    await expect(item.getByRole("list", { name: "Replies" })).toHaveCount(0)

    const button = likeButtonIn(item)
    await expect(button).toHaveAccessibleName("Like, 1 like")
    await expect(button).toHaveAttribute("aria-pressed", "true")
    await page.unroute(feedRequest)
  } finally {
    await page.request.delete(`${API_URL}/quacks/${reply.id}`)
    await page.request.delete(`${API_URL}/quacks/${quack.id}`)
  }
})

test("E4: a liked reply is still liked when its replies are opened again", async ({ page }) => {
  await signIn(page, "caffeinatedduck@example.com", "password1")
  const text = `Like my reply ${Date.now()}`
  const replyText = `Likeable reply ${Date.now()}`
  const quack = await post(page, "quacks", { text })
  const reply = await post(page, `quacks/${quack.id}/replies`, { text: replyText })

  try {
    await page.goto("/quacks")
    const item = page.getByRole("article").filter({ hasText: text })
    const repliesToggle = item.getByRole("button", { name: "1 reply" })
    const replyItem = () =>
      item.getByRole("list", { name: "Replies" }).getByRole("listitem").filter({
        hasText: replyText,
      })

    await repliesToggle.click()
    // fails here, as an assertion, while the button doesn't exist yet
    await expect(likeButtonIn(replyItem())).toBeVisible()
    await likeButtonIn(replyItem()).click()
    await expect(likeButtonIn(replyItem())).toHaveAccessibleName("Like, 1 like")

    await repliesToggle.click()
    await expect(item.getByRole("list", { name: "Replies" })).toHaveCount(0)
    await repliesToggle.click()

    const replyButton = likeButtonIn(replyItem())
    await expect(replyButton).toHaveAccessibleName("Like, 1 like")
    await expect(replyButton).toHaveAttribute("aria-pressed", "true")
    // the quack's own count didn't move
    await expect(quackLikeButton(item)).toHaveAccessibleName("Like, 0 likes")
  } finally {
    await page.request.delete(`${API_URL}/quacks/${reply.id}`)
    await page.request.delete(`${API_URL}/quacks/${quack.id}`)
  }
})
