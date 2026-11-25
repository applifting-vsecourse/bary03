import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { QuackItem } from "@/features/quack/components/QuackItem"
import { QuackReplyItem } from "@/features/quack/components/QuackReplyItem"

// Where the like control shows up, not what it does: stub the liking hook.
vi.mock("@/features/quack/hooks/useLike", () => ({
  useLike: () => ({ setLiked: vi.fn(), isPending: false, isError: false }),
}))

// Plain objects, not the zod types: those don't carry `likes` until the
// feature does.
const withLikes = { likes: { count: 3, likedByMe: false } }

const liveQuack = {
  id: "q1",
  deleted: false as const,
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  replyCount: 0,
  ...withLikes,
}

const placeholder = {
  id: "q2",
  deleted: true as const,
  text: null,
  mood: null,
  userId: null,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: null,
  poll: null,
  replyCount: 1,
  likes: null,
}

const reply = {
  id: "r1",
  text: "a reply",
  parentId: "q1",
  userId: "u2",
  createdAt: new Date("2026-01-01T12:05:00Z"),
  user: { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
  ...withLikes,
}

const renderWithClient = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe("where the like control shows", () => {
  it("shows a like button with its count on a quack", () => {
    renderWithClient(<QuackItem quack={liveQuack} />)

    expect(screen.getByRole("button", { name: "Like, 3 likes" })).toBeInTheDocument()
  })

  it("shows a like button with its count on a reply (R9)", () => {
    renderWithClient(
      <ul>
        <QuackReplyItem reply={reply} />
      </ul>,
    )

    expect(screen.getByRole("button", { name: "Like, 3 likes" })).toBeInTheDocument()
  })

  it("shows no like button and no count on a placeholder (R17)", () => {
    renderWithClient(
      <>
        <QuackItem quack={liveQuack} />
        <QuackItem quack={placeholder} />
      </>,
    )

    // the live quack's button is the only one: the placeholder has none
    expect(screen.getAllByRole("button", { name: /^Like,/ })).toHaveLength(1)
    const placeholderItem = screen.getByText("This quack was deleted").closest("article")
    expect(placeholderItem).not.toHaveTextContent(/likes?\b/)
  })
})
