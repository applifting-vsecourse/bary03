import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackReplyList } from "@/features/quack/components/QuackReplyList"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

// The list is under test, not the network: stub the HTTP client.
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const reply = (id: string, text: string, name: string, username: string, createdAt: string) => ({
  id,
  text,
  parentId: "q1",
  userId: `user-${id}`,
  createdAt,
  user: { id: `user-${id}`, name, username },
})

const respondWith = (body: unknown) => ({ json: () => Promise.resolve(body) })

const renderList = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <QuackReplyList quackId="q1" />
    </QueryClientProvider>,
  )

describe("QuackReplyList", () => {
  beforeEach(() => {
    get.mockReset()
  })

  it("shows the replies in the order the server sends, oldest first, with author and date", async () => {
    get.mockReturnValue(
      respondWith([
        reply(
          "r1",
          "ok but who reflects the pond",
          "Caffeinated Duck",
          "CaffeinatedDuck",
          "2026-11-09T10:00:00",
        ),
        reply(
          "r2",
          "The sky has never once fed me.",
          "The Bread Critic",
          "BreadCritic",
          "2026-11-09T11:20:00",
        ),
      ]),
    )
    renderList()

    const items = within(await screen.findByRole("list", { name: "Replies" })).getAllByRole(
      "listitem",
    )
    expect(get).toHaveBeenCalledWith("quacks/q1/replies")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("ok but who reflects the pond")
    expect(items[0]).toHaveTextContent("Caffeinated Duck")
    expect(items[0]).toHaveTextContent("@CaffeinatedDuck")
    expect(items[0]).toHaveTextContent("09-11-2026 10:00")
    expect(items[1]).toHaveTextContent("The sky has never once fed me.")
    expect(items[1]).toHaveTextContent("@BreadCritic")
    expect(items[1]).toHaveTextContent("09-11-2026 11:20")
  })

  it("says so when there are no replies yet", async () => {
    get.mockReturnValue(respondWith([]))
    renderList()

    expect(await screen.findByText("No replies yet. Be the first to reply.")).toBeInTheDocument()
  })

  it("shows that it is loading", () => {
    // a response that never arrives
    get.mockReturnValue({ json: () => new Promise(() => undefined) })
    renderList()

    expect(screen.getByText("Loading replies…")).toBeInTheDocument()
  })

  it("says what went wrong and loads again on retry", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("This quack does not exist")) })
    get.mockReturnValueOnce(respondWith([]))
    renderList()

    expect(await screen.findByText("This quack does not exist")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByText("No replies yet. Be the first to reply.")).toBeInTheDocument()
  })
})
