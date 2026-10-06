import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackForm } from "@/features/quack/components/QuackForm"

const mutate = vi.fn()

// The form is under test, not the network: stub the mutation hook.
vi.mock("@/features/quack/hooks/useAddQuack", () => ({
  useAddQuack: () => ({ mutate, isPending: false, error: null }),
}))

describe("QuackForm", () => {
  beforeEach(() => {
    mutate.mockReset()
  })

  it("posts without a mood by default", async () => {
    render(<QuackForm />)

    await userEvent.type(screen.getByLabelText("New quack"), "hello pond")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(mutate).toHaveBeenCalledWith({ text: "hello pond", mood: undefined }, expect.anything())
  })

  it("posts the chosen mood", async () => {
    render(<QuackForm />)

    await userEvent.type(screen.getByLabelText("New quack"), "who took my bread")
    await userEvent.click(screen.getByRole("combobox", { name: "Mood" }))
    await userEvent.click(screen.getByRole("option", { name: /angry/i }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(mutate).toHaveBeenCalledWith(
      { text: "who took my bread", mood: "angry" },
      expect.anything(),
    )
  })
})
