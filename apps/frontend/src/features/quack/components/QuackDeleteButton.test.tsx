import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { DeletedQuack, LiveQuack, Quack, Reply } from "@/features/quack/api/quackSchemas"
import { QuackDeleteButton } from "@/features/quack/components/QuackDeleteButton"

const { del } = vi.hoisted(() => ({ del: vi.fn() }))

// The button is under test, not the network: stub the HTTP client.
vi.mock("@/lib/api-client", () => ({ api: { delete: del } }))

const quack = (id: string): LiveQuack => ({
  id,
  deleted: false,
  text: `quack ${id}`,
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  replyCount: 0,
})

const setup = (moderatedAuthorName?: string, replyCount = 0) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  // The quack is in the All feed and in Mine.
  const q1 = { ...quack("q1"), replyCount }
  queryClient.setQueryData(quackKeys.list(""), [q1, quack("q2")])
  queryClient.setQueryData(quackKeys.list("", "mine"), [q1])
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  render(
    <QueryClientProvider client={queryClient}>
      <QuackDeleteButton
        quackId="q1"
        replyCount={replyCount}
        moderatedAuthorName={moderatedAuthorName}
      />
    </QueryClientProvider>,
  )
  const list = (filter: "all" | "mine") =>
    queryClient.getQueryData<Quack[]>(quackKeys.list("", filter))
  const ids = (filter: "all" | "mine") => list(filter)?.map((q) => q.id)
  return { ids, list }
}

describe("QuackDeleteButton", () => {
  beforeEach(() => {
    del.mockReset()
    del.mockResolvedValue(new Response(null, { status: 204 }))
  })

  it("asks before deleting", async () => {
    setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

    expect(screen.getByRole("alertdialog", { name: "Delete this quack?" })).toBeInTheDocument()
    expect(del).not.toHaveBeenCalled()
  })

  it("deletes nothing when cancelled", async () => {
    const { ids } = setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(del).not.toHaveBeenCalled()
    expect(ids("all")).toEqual(["q1", "q2"])
  })

  it("deletes once confirmed and takes the quack off every feed", async () => {
    const { ids } = setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(del).toHaveBeenCalledWith("quacks/q1")
    expect(ids("all")).toEqual(["q2"])
    expect(ids("mine")).toEqual([])
  })

  it("keeps the dialog open with the reason when deleting fails", async () => {
    del.mockRejectedValue(new Error("You can only delete your own quacks"))
    const { ids } = setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(
      await screen.findByText("Couldn't delete the quack: You can only delete your own quacks"),
    ).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(ids("all")).toEqual(["q1", "q2"])
  })
  describe("as a moderator", () => {
    it("names the author and says I'm deleting it as a moderator", async () => {
      setup("Deep Duck Thoughts")

      await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

      const dialog = screen.getByRole("alertdialog", { name: "Delete Deep Duck Thoughts' quack?" })
      expect(dialog).toHaveTextContent("You're deleting it as a moderator.")
    })

    it("uses 's for a name that doesn't end in s", async () => {
      setup("Caffeinated Duck")

      await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

      expect(
        screen.getByRole("alertdialog", { name: "Delete Caffeinated Duck's quack?" }),
      ).toBeInTheDocument()
    })

    it("deletes once confirmed", async () => {
      const { ids } = setup("Deep Duck Thoughts")

      await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
      await userEvent.click(screen.getByRole("button", { name: "Delete" }))

      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
      expect(del).toHaveBeenCalledWith("quacks/q1")
      expect(ids("all")).toEqual(["q2"])
    })
  })

  describe("a quack with replies", () => {
    it("says the replies will stay under a placeholder", async () => {
      setup(undefined, 2)

      await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

      const dialog = screen.getByRole("alertdialog", { name: "Delete this quack?" })
      expect(dialog).toHaveTextContent(
        'Its 2 replies will stay, under "This quack was deleted". Everything else about it is erased, including who wrote it.',
      )
      expect(dialog).not.toHaveTextContent("disappears from the feed")
    })

    it("says it of a single reply too", async () => {
      setup(undefined, 1)

      await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

      expect(screen.getByRole("alertdialog")).toHaveTextContent(
        'Its reply will stay, under "This quack was deleted".',
      )
    })

    it("gives a moderator the moderator wording, then the same sentence", async () => {
      setup("Deep Duck Thoughts", 2)

      await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

      expect(
        screen.getByRole("alertdialog", { name: "Delete Deep Duck Thoughts' quack?" }),
      ).toHaveTextContent(
        'You\'re deleting it as a moderator. Its 2 replies will stay, under "This quack was deleted".',
      )
    })

    it("leaves a placeholder in its place, with nothing of the quack", async () => {
      const { ids, list } = setup(undefined, 2)

      await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
      await userEvent.click(screen.getByRole("button", { name: "Delete" }))

      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
      expect(ids("all")).toEqual(["q1", "q2"])
      expect(list("all")?.[0]).toEqual({
        id: "q1",
        deleted: true,
        text: null,
        mood: null,
        userId: null,
        createdAt: new Date("2026-01-01T12:00:00Z"),
        user: null,
        poll: null,
        replyCount: 2,
      })
    })
  })

  it("says nothing about moderating on my own quack", async () => {
    setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

    expect(screen.getByRole("alertdialog")).not.toHaveTextContent("moderator")
  })
})

describe("QuackDeleteButton on a reply", () => {
  const reply = (id: string): Reply => ({
    id,
    text: `reply ${id}`,
    parentId: "p1",
    userId: "u1",
    createdAt: new Date("2026-01-01T12:05:00Z"),
    user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  })

  const placeholder = (replyCount: number): DeletedQuack => ({
    id: "p1",
    deleted: true,
    text: null,
    mood: null,
    userId: null,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    user: null,
    poll: null,
    replyCount,
  })

  const setupReply = (parent: Quack, moderatedAuthorName?: string) => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    queryClient.setQueryData(quackKeys.list(""), [parent, quack("q2")])
    queryClient.setQueryData(
      quackKeys.replies("p1"),
      Array.from({ length: parent.replyCount }, (_, index) => reply(`r${index + 1}`)),
    )
    vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
    render(
      <QueryClientProvider client={queryClient}>
        <QuackDeleteButton
          quackId="r1"
          parentId="p1"
          moderatedAuthorName={moderatedAuthorName}
        />
      </QueryClientProvider>,
    )
    return {
      feed: () => queryClient.getQueryData<Quack[]>(quackKeys.list("")),
      replyIds: () =>
        queryClient.getQueryData<Reply[]>(quackKeys.replies("p1"))?.map((item) => item.id),
    }
  }

  const confirmDelete = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Delete reply" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
  }

  beforeEach(() => {
    del.mockReset()
    del.mockResolvedValue(new Response(null, { status: 204 }))
  })

  it("asks with the reply wording", async () => {
    setupReply({ ...quack("p1"), replyCount: 2 })

    await userEvent.click(screen.getByRole("button", { name: "Delete reply" }))

    const dialog = screen.getByRole("alertdialog", { name: "Delete this reply?" })
    expect(dialog).toHaveTextContent("It disappears for everyone. You can't undo this.")
    expect(dialog).not.toHaveTextContent("moderator")
  })

  it("names the author for a moderator", async () => {
    setupReply({ ...quack("p1"), replyCount: 2 }, "Deep Duck Thoughts")

    await userEvent.click(screen.getByRole("button", { name: "Delete reply" }))

    expect(
      screen.getByRole("alertdialog", { name: "Delete Deep Duck Thoughts' reply?" }),
    ).toHaveTextContent("You're deleting it as a moderator. It disappears for everyone.")
  })

  it("takes the reply out of the list and the count down at once", async () => {
    const { feed, replyIds } = setupReply({ ...quack("p1"), replyCount: 2 })

    await confirmDelete()

    expect(del).toHaveBeenCalledWith("quacks/r1")
    expect(replyIds()).toEqual(["r2"])
    expect(feed()?.find((item) => item.id === "p1")?.replyCount).toBe(1)
  })

  it("keeps a placeholder that still has replies", async () => {
    const { feed } = setupReply(placeholder(2))

    await confirmDelete()

    expect(feed()?.map((item) => item.id)).toEqual(["p1", "q2"])
    expect(feed()?.[0]?.replyCount).toBe(1)
  })

  it("takes the placeholder off the feed with its last reply", async () => {
    const { feed, replyIds } = setupReply(placeholder(1))

    await confirmDelete()

    expect(replyIds()).toEqual([])
    expect(feed()?.map((item) => item.id)).toEqual(["q2"])
  })

  it("keeps the dialog open with the reason when deleting fails", async () => {
    del.mockRejectedValue(new Error("You can only delete your own quacks"))
    const { replyIds } = setupReply({ ...quack("p1"), replyCount: 1 })

    await userEvent.click(screen.getByRole("button", { name: "Delete reply" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(
      await screen.findByText("Couldn't delete the reply: You can only delete your own quacks"),
    ).toBeInTheDocument()
    expect(replyIds()).toEqual(["r1"])
  })
})
