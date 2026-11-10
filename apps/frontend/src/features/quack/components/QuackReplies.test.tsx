import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { QuackReplies, replyCountLabel } from "@/features/quack/components/QuackReplies"

// The control is under test, not the network: stub the mutation hook.
vi.mock("@/features/quack/hooks/useAddReply", () => ({
  useAddReply: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

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
  it("shows the count and keeps the reply box closed", () => {
    render(
      <QuackReplies
        quackId="q1"
        replyCount={2}
      />,
    )

    const toggle = screen.getByRole("button", { name: "2 replies" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument()
  })

  it("opens the reply box with the cursor in it, and closes it again", async () => {
    render(
      <QuackReplies
        quackId="q1"
        replyCount={0}
      />,
    )
    const toggle = screen.getByRole("button", { name: "Reply" })

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByLabelText("Your reply")).toHaveFocus()

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument()
  })
})
