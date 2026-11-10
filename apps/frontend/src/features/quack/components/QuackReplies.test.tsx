import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackReplies, replyCountLabel } from "@/features/quack/components/QuackReplies"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

// The control is under test, not the network: stub the HTTP client and the
// mutation hook.
vi.mock("@/lib/api-client", () => ({ api: { get } }))
vi.mock("@/features/quack/hooks/useAddReply", () => ({
  useAddReply: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const renderReplies = (replyCount: number) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <QuackReplies
        quackId="q1"
        replyCount={replyCount}
      />
    </QueryClientProvider>,
  )

describe("replyCountLabel", () => {
  it.each([
    [0, "Reply"],
    [1, "1 reply"],
    [2, "2 replies"],
    [12, "12 replies"],
  ])("labels %i as %j", (count, label) => {
    expect(replyCountLabel(count)).toBe(label)
  })
})

describe("QuackReplies", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockReturnValue({ json: () => Promise.resolve([]) })
  })

  it("shows the count and loads nothing until opened", () => {
    renderReplies(2)

    const toggle = screen.getByRole("button", { name: "2 replies" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })

  it("opens the replies and the reply box, and closes them again", async () => {
    renderReplies(0)
    const toggle = screen.getByRole("button", { name: "Reply" })

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(get).toHaveBeenCalledWith("quacks/q1/replies")
    expect(await screen.findByText("No replies yet. Be the first to reply.")).toBeInTheDocument()
    expect(screen.getByLabelText("Your reply")).toHaveFocus()

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument()
  })
})
