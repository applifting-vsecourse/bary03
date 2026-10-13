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

  it("starts with the default mood and returns to it after posting", async () => {
    mutate.mockImplementation((_values, options: { onSuccess?: () => void }) =>
      options.onSuccess?.(),
    )
    render(<QuackForm defaultMood="happy" />)
    const mood = screen.getByRole("combobox", { name: "Mood" })
    expect(mood).toHaveTextContent("Happy")

    await userEvent.type(screen.getByLabelText("New quack"), "bread!")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(mutate).toHaveBeenCalledWith({ text: "bread!", mood: "happy" }, expect.anything())
    expect(mood).toHaveTextContent("Happy")
  })

  it("adopts a default mood that arrives after it opened", async () => {
    const { rerender } = render(<QuackForm />)

    rerender(<QuackForm defaultMood="sad" />)

    expect(screen.getByRole("combobox", { name: "Mood" })).toHaveTextContent("Sad")
    await userEvent.type(screen.getByLabelText("New quack"), "rain again")
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))
    expect(mutate).toHaveBeenCalledWith({ text: "rain again", mood: "sad" }, expect.anything())
  })

  it("lets the default mood be changed for one post", async () => {
    render(<QuackForm defaultMood="happy" />)

    await userEvent.type(screen.getByLabelText("New quack"), "meh")
    await userEvent.click(screen.getByRole("combobox", { name: "Mood" }))
    await userEvent.click(screen.getByRole("option", { name: "No mood" }))
    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(mutate).toHaveBeenCalledWith({ text: "meh", mood: undefined }, expect.anything())
  })
})
