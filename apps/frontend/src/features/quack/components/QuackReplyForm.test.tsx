import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackReplyForm } from "@/features/quack/components/QuackReplyForm"

const mutate = vi.fn()
let error: Error | null = null

// The form is under test, not the network: stub the mutation hook.
vi.mock("@/features/quack/hooks/useAddReply", () => ({
  useAddReply: () => ({ mutate, isPending: false, error }),
}))

const HINT = "Up to 280 characters."

describe("QuackReplyForm", () => {
  beforeEach(() => {
    mutate.mockReset()
    error = null
  })

  it("posts the trimmed reply under the quack and empties the box", async () => {
    mutate.mockImplementation((_values, options: { onSuccess?: () => void }) =>
      options.onSuccess?.(),
    )
    render(<QuackReplyForm quackId="q1" />)
    const box = screen.getByLabelText("Your reply")

    await userEvent.type(box, "  ok but who reflects the pond  ")
    await userEvent.click(screen.getByRole("button", { name: "Post reply" }))

    expect(mutate).toHaveBeenCalledWith(
      { quackId: "q1", text: "ok but who reflects the pond" },
      expect.anything(),
    )
    expect(box).toHaveValue("")
  })

  it("shows the hint until there is an error", () => {
    render(<QuackReplyForm quackId="q1" />)

    expect(screen.getByText(HINT)).toBeInTheDocument()
  })

  it.each(["", "   "])("refuses the empty reply %j in place of the hint", async (text) => {
    render(<QuackReplyForm quackId="q1" />)

    if (text) await userEvent.type(screen.getByLabelText("Your reply"), text)
    await userEvent.click(screen.getByRole("button", { name: "Post reply" }))

    expect(
      await screen.findByText("Reply can't be empty — write something first."),
    ).toBeInTheDocument()
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("says how long a reply that is too long is", async () => {
    render(<QuackReplyForm quackId="q1" />)

    // paste rather than type: 312 keystrokes would make the test slow
    await userEvent.click(screen.getByLabelText("Your reply"))
    await userEvent.paste("a".repeat(312))
    await userEvent.click(screen.getByRole("button", { name: "Post reply" }))

    expect(
      await screen.findByText("Reply is too long — use at most 280 characters (you have 312)."),
    ).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("keeps the text and says what went wrong when posting fails", async () => {
    error = new Error("This quack was deleted, so it can't get new replies.")
    render(<QuackReplyForm quackId="q1" />)

    await userEvent.type(screen.getByLabelText("Your reply"), "still here")
    await userEvent.click(screen.getByRole("button", { name: "Post reply" }))

    expect(
      screen.getByText("This quack was deleted, so it can't get new replies."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Your reply")).toHaveValue("still here")
  })
})
