import { expect, test, type Page } from "@playwright/test"

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

test.describe("deleting quacks and replies", () => {
  // Every test here posts its own quack, so the quack (and later its
  // placeholder) is the newest item in the feed: the tests in this file run
  // one after another, and nothing else posts meanwhile. Each test still
  // checks it has the right item, by its own reply.
  const PLACEHOLDER = "This quack was deleted"

  type Posted = { id: string }

  const post = async (from: Page, path: string, data: object): Promise<Posted> => {
    const response = await from.request.post(`${API_URL}/${path}`, { data })
    expect(response.status()).toBe(201)
    return (await response.json()) as Posted
  }

  const feedJson = async (from: Page, query = "") =>
    (await (await from.request.get(`${API_URL}/quacks${query}`)).json()) as {
      id: string
      deleted: boolean
    }[]

  test("the author's delete keeps the replies and erases the quack everywhere", async ({
    browser,
    page,
  }) => {
    const stamp = Date.now()
    const text = `Secret pond plans ${stamp}`
    const answers = [`Reeds ${stamp}`, `Lilies ${stamp}`]
    const replyText = `Count me in ${stamp}`

    // CaffeinatedDuck writes a poll with a mood, DeepDuckThoughts votes and replies.
    await signIn(page, "caffeinatedduck@example.com", "password1")
    const replierContext = await browser.newContext()
    const replierPage = await replierContext.newPage()
    await signIn(replierPage, "deepduckthoughts@example.com", "password2")
    const quack = await post(page, "quacks", { text, mood: "happy", poll: { answers } })
    let reply: Posted | undefined

    try {
      const { poll } = (await feedJson(replierPage)).find((q) => q.id === quack.id) as unknown as {
        poll: { options: { id: string }[] }
      }
      const [firstAnswer] = poll.options
      expect(firstAnswer).toBeDefined()
      const voted = await replierPage.request.put(`${API_URL}/quacks/${quack.id}/vote`, {
        data: { optionId: firstAnswer?.id, clientId: crypto.randomUUID(), clientSeq: 1 },
      })
      expect(voted.status()).toBe(200)
      reply = await post(replierPage, `quacks/${quack.id}/replies`, { text: replyText })

      await page.goto("/quacks")
      const item = page.getByRole("article").filter({ hasText: text })
      await item.getByRole("button", { name: "Delete quack" }).click()
      const dialog = page.getByRole("alertdialog", { name: "Delete this quack?" })
      await expect(dialog).toContainText(`Its reply will stay, under "${PLACEHOLDER}".`)
      await dialog.getByRole("button", { name: "Delete", exact: true }).click()
      await expect(dialog).toBeHidden()

      // The feed: a placeholder in its place, with the reply and nothing else.
      const placeholder = page.getByRole("article").first()
      await expect(placeholder).toContainText(PLACEHOLDER)
      await placeholder.getByRole("button", { name: "1 reply" }).click()
      const replies = placeholder.getByRole("list", { name: "Replies" }).getByRole("listitem")
      await expect(replies).toHaveCount(1)
      await expect(replies).toContainText(replyText)
      await expect(replies).toContainText("@DeepDuckThoughts")
      await expect(placeholder.getByLabel("Your reply")).toHaveCount(0)
      await expect(placeholder).not.toContainText("Caffeinated Duck")
      await expect(placeholder).not.toContainText("@CaffeinatedDuck")
      await expect(placeholder.getByRole("button", { name: "Delete quack" })).toHaveCount(0)
      for (const gone of [text, ...answers]) {
        await expect(page.getByText(gone)).toHaveCount(0)
      }

      // Search by its text finds nothing.
      await page.getByLabel("Search quacks").fill(text)
      await expect(page.getByText("No posts match your search.")).toBeVisible()
      await expect(page.getByRole("article")).toHaveCount(0)

      // Search by its author's name finds their other quacks, never a placeholder.
      await page.getByLabel("Search quacks").fill("Caffeinated Duck")
      await expect(page.getByRole("article").first()).toContainText("Caffeinated Duck")
      await expect(page.getByRole("article").filter({ hasText: PLACEHOLDER })).toHaveCount(0)

      // Mine no longer lists it.
      await page.getByLabel("Search quacks").fill("")
      await page.getByRole("tab", { name: "Mine" }).click()
      await expect(page.getByRole("article").first()).toBeVisible()
      await expect(page.getByRole("article").filter({ hasText: PLACEHOLDER })).toHaveCount(0)
      await expect(page.getByText(text)).toHaveCount(0)

      // The API carries nothing of it either, for anyone.
      const fromFeed = (await feedJson(replierPage)).find((q) => q.id === quack.id)
      expect(fromFeed).toMatchObject({ deleted: true, text: null, user: null, poll: null })
      for (const body of [
        JSON.stringify(fromFeed),
        await (await replierPage.request.get(`${API_URL}/quacks/${quack.id}/replies`)).text(),
      ]) {
        expect(body).not.toContain(text)
        expect(body).not.toContain("CaffeinatedDuck")
        for (const answer of answers) expect(body).not.toContain(answer)
      }
      const searched = await feedJson(replierPage, `?q=${encodeURIComponent("Caffeinated Duck")}`)
      expect(searched.map((q) => q.id)).not.toContain(quack.id)
      expect((await feedJson(page, "?mine=true")).map((q) => q.id)).not.toContain(quack.id)

      // It takes no new replies, and can't be deleted again.
      const late = await replierPage.request.post(`${API_URL}/quacks/${quack.id}/replies`, {
        data: { text: "too late" },
      })
      expect(late.status()).toBe(409)
      expect(((await late.json()) as { message: string }).message).toBe(
        "This quack was deleted, so it can't get new replies.",
      )
      expect((await page.request.delete(`${API_URL}/quacks/${quack.id}`)).status()).toBe(404)
    } finally {
      // The reply's author deletes it, which takes the placeholder with it.
      if (reply) await replierPage.request.delete(`${API_URL}/quacks/${reply.id}`)
      await page.request.delete(`${API_URL}/quacks/${quack.id}`)
      await replierContext.close()
    }
  })

  test("a moderator's delete keeps the replies too", async ({ browser, page }) => {
    const stamp = Date.now()
    const text = `Moderate me, with replies ${stamp}`
    const replyText = `Please don't ${stamp}`
    const authorContext = await browser.newContext()
    const authorPage = await authorContext.newPage()
    await signIn(authorPage, "caffeinatedduck@example.com", "password1")
    const quack = await post(authorPage, "quacks", { text })
    const replies: Posted[] = []

    try {
      replies.push(await post(authorPage, `quacks/${quack.id}/replies`, { text: replyText }))
      replies.push(
        await post(authorPage, `quacks/${quack.id}/replies`, { text: `${replyText} again` }),
      )

      await signIn(page, "admin@example.com", "adminpassword")
      await page.goto("/quacks")
      const item = page.getByRole("article").filter({ hasText: text })
      await item.getByRole("button", { name: "Delete quack" }).click()
      const dialog = page.getByRole("alertdialog", { name: "Delete Caffeinated Duck's quack?" })
      await expect(dialog).toContainText(
        `You're deleting it as a moderator. Its 2 replies will stay, under "${PLACEHOLDER}".`,
      )
      await dialog.getByRole("button", { name: "Delete", exact: true }).click()
      await expect(dialog).toBeHidden()

      const placeholder = page.getByRole("article").first()
      await expect(placeholder).toContainText(PLACEHOLDER)
      await placeholder.getByRole("button", { name: "2 replies" }).click()
      await expect(placeholder.getByRole("listitem").first()).toContainText(replyText)
      await expect(page.getByText(text)).toHaveCount(0)
      // not even a moderator can delete a placeholder
      await expect(placeholder.getByRole("button", { name: "Delete quack" })).toHaveCount(0)
      // gone from the author's Mine too
      expect((await feedJson(authorPage, "?mine=true")).map((q) => q.id)).not.toContain(quack.id)
    } finally {
      // Replies first (the last one takes a placeholder with it), then the
      // quack, in case the test stopped before the moderator deleted it.
      for (const { id } of replies) await authorPage.request.delete(`${API_URL}/quacks/${id}`)
      await authorPage.request.delete(`${API_URL}/quacks/${quack.id}`)
      await authorContext.close()
    }
  })

  test("deleting the last reply under a placeholder removes the placeholder", async ({
    browser,
    page,
  }) => {
    const stamp = Date.now()
    const text = `Soon a placeholder ${stamp}`
    await signIn(page, "caffeinatedduck@example.com", "password1")
    const replierContext = await browser.newContext()
    const replierPage = await replierContext.newPage()
    await signIn(replierPage, "deepduckthoughts@example.com", "password2")
    const quack = await post(page, "quacks", { text })
    const replies: (Posted & { by: Page })[] = []

    try {
      replies.push({
        ...(await post(replierPage, `quacks/${quack.id}/replies`, { text: `One ${stamp}` })),
        by: replierPage,
      })
      replies.push({
        ...(await post(page, `quacks/${quack.id}/replies`, { text: `Two ${stamp}` })),
        by: page,
      })
      const [first, last] = replies as [Posted & { by: Page }, Posted & { by: Page }]
      expect((await page.request.delete(`${API_URL}/quacks/${quack.id}`)).status()).toBe(204)

      await page.goto("/quacks")
      const placeholder = page.getByRole("article").first()
      await expect(placeholder).toContainText(PLACEHOLDER)
      await expect(placeholder.getByRole("button", { name: "2 replies" })).toBeVisible()

      // One reply left: the placeholder stays, with the count down by one.
      expect((await first.by.request.delete(`${API_URL}/quacks/${first.id}`)).status()).toBe(204)
      await page.reload()
      await expect(placeholder.getByRole("button", { name: "1 reply" })).toBeVisible()

      // The last reply goes, and the placeholder with it.
      expect((await last.by.request.delete(`${API_URL}/quacks/${last.id}`)).status()).toBe(204)
      await page.reload()
      await expect(page.getByRole("article").first()).not.toContainText(PLACEHOLDER)
      expect((await feedJson(page)).map((q) => q.id)).not.toContain(quack.id)
      expect((await page.request.get(`${API_URL}/quacks/${quack.id}/replies`)).status()).toBe(404)
    } finally {
      // Each reply by its own author; already-deleted ones just get a 404.
      for (const { id, by } of replies) await by.request.delete(`${API_URL}/quacks/${id}`)
      await page.request.delete(`${API_URL}/quacks/${quack.id}`)
      await replierContext.close()
    }
  })

  test("a reply's author deletes it through the app", async ({ browser, page }) => {
    const stamp = Date.now()
    const text = `Two answers ${stamp}`
    const authorContext = await browser.newContext()
    const authorPage = await authorContext.newPage()
    await signIn(authorPage, "caffeinatedduck@example.com", "password1")
    await signIn(page, "deepduckthoughts@example.com", "password2")
    const quack = await post(authorPage, "quacks", { text })
    const theirs = await post(authorPage, `quacks/${quack.id}/replies`, {
      text: `Theirs ${stamp}`,
    })
    const mine = await post(page, `quacks/${quack.id}/replies`, { text: `Mine ${stamp}` })

    try {
      await page.goto("/quacks")
      const item = page.getByRole("article").filter({ hasText: text })
      await item.getByRole("button", { name: "2 replies" }).click()
      const replies = item.getByRole("list", { name: "Replies" }).getByRole("listitem")
      await expect(replies).toHaveCount(2)
      // only my own reply can be deleted
      await expect(
        replies
          .filter({ hasText: `Theirs ${stamp}` })
          .getByRole("button", { name: "Delete reply" }),
      ).toHaveCount(0)

      await replies
        .filter({ hasText: `Mine ${stamp}` })
        .getByRole("button", { name: "Delete reply" })
        .click()
      const dialog = page.getByRole("alertdialog", { name: "Delete this reply?" })
      await expect(dialog).toContainText("It disappears for everyone.")
      await dialog.getByRole("button", { name: "Delete", exact: true }).click()

      await expect(dialog).toBeHidden()
      await expect(replies).toHaveCount(1)
      await expect(replies).toContainText(`Theirs ${stamp}`)
      await expect(item.getByRole("button", { name: "1 reply" })).toBeVisible()
      const left = (await (
        await page.request.get(`${API_URL}/quacks/${quack.id}/replies`)
      ).json()) as Posted[]
      expect(left.map((reply) => reply.id)).toEqual([theirs.id])
    } finally {
      await page.request.delete(`${API_URL}/quacks/${mine.id}`)
      await authorPage.request.delete(`${API_URL}/quacks/${theirs.id}`)
      await authorPage.request.delete(`${API_URL}/quacks/${quack.id}`)
      await authorContext.close()
    }
  })

  test("a moderator deletes the last reply under a placeholder, which leaves the feed at once", async ({
    browser,
    page,
  }) => {
    const stamp = Date.now()
    const replyText = `Last one standing ${stamp}`
    const authorContext = await browser.newContext()
    const authorPage = await authorContext.newPage()
    await signIn(authorPage, "caffeinatedduck@example.com", "password1")
    const replierContext = await browser.newContext()
    const replierPage = await replierContext.newPage()
    await signIn(replierPage, "deepduckthoughts@example.com", "password2")
    const quack = await post(authorPage, "quacks", { text: `Going soon ${stamp}` })
    const reply = await post(replierPage, `quacks/${quack.id}/replies`, { text: replyText })
    expect((await authorPage.request.delete(`${API_URL}/quacks/${quack.id}`)).status()).toBe(204)

    try {
      await signIn(page, "admin@example.com", "adminpassword")
      await page.goto("/quacks")
      const placeholder = page.getByRole("article").first()
      await expect(placeholder).toContainText(PLACEHOLDER)
      await placeholder.getByRole("button", { name: "1 reply" }).click()
      await expect(placeholder.getByRole("listitem")).toContainText(replyText)

      // Hold back the feed's refetch, so only the app's own update can take
      // the placeholder away: "straight away", not on the next load.
      const feedRequest = /\/api\/quacks(\?[^/]*)?$/
      await page.route(feedRequest, (route) =>
        route.request().method() === "GET" ? route.abort() : route.fallback(),
      )
      await placeholder.getByRole("button", { name: "Delete reply" }).click()
      const dialog = page.getByRole("alertdialog", { name: "Delete Deep Duck Thoughts' reply?" })
      await expect(dialog).toContainText("You're deleting it as a moderator.")
      await dialog.getByRole("button", { name: "Delete", exact: true }).click()

      await expect(dialog).toBeHidden()
      await expect(page.getByText(replyText)).toHaveCount(0)
      await expect(page.getByRole("article").filter({ hasText: PLACEHOLDER })).toHaveCount(0)
      await page.unroute(feedRequest)

      // and gone on the server too
      expect((await feedJson(replierPage)).map((q) => q.id)).not.toContain(quack.id)
    } finally {
      await replierPage.request.delete(`${API_URL}/quacks/${reply.id}`)
      await authorPage.request.delete(`${API_URL}/quacks/${quack.id}`)
      await replierContext.close()
      await authorContext.close()
    }
  })
})
