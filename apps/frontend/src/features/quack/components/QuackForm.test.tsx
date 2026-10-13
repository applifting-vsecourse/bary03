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

describe("QuackForm poll", () => {
  beforeEach(() => {
    mutate.mockReset()
  })

  const answerField = (number: number) => screen.getByLabelText(`Answer ${number}`)
  const button = (name: string) => screen.getByRole("button", { name })
  const quack = () => userEvent.click(button("Quack"))

  const startPoll = async (question = "Where do we go for lunch?") => {
    render(<QuackForm />)
    await userEvent.type(screen.getByLabelText("New quack"), question)
    await userEvent.click(button("Add a poll"))
  }

  it("starts with no poll", () => {
    render(<QuackForm />)

    expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()
    expect(button("Add a poll")).toBeInTheDocument()
  })

  it("adds two empty answers and puts the cursor in the first", async () => {
    await startPoll()

    expect(answerField(1)).toHaveValue("")
    expect(answerField(2)).toHaveValue("")
    expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
    expect(answerField(1)).toHaveFocus()
    expect(screen.queryByRole("button", { name: "Add a poll" })).not.toBeInTheDocument()
  })

  it("adds answers up to 4 and removes them down to 2", async () => {
    await startPoll()
    expect(screen.queryByRole("button", { name: /^Remove answer/ })).not.toBeInTheDocument()

    await userEvent.click(button("Add an answer"))
    await userEvent.click(button("Add an answer"))

    expect(answerField(4)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add an answer" })).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^Remove answer/ })).toHaveLength(4)

    await userEvent.type(answerField(3), "Salad bar")
    await userEvent.click(button("Remove answer 2"))
    await userEvent.click(button("Remove answer 1"))

    expect(answerField(1)).toHaveValue("Salad bar")
    expect(screen.queryByLabelText("Answer 3")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Remove answer/ })).not.toBeInTheDocument()
  })

  it("posts the answers, trimmed and in order, with the question and mood", async () => {
    render(<QuackForm defaultMood="happy" />)
    await userEvent.type(screen.getByLabelText("New quack"), "Where do we go for lunch?")
    await userEvent.click(button("Add a poll"))
    await userEvent.click(button("Add an answer"))

    await userEvent.type(answerField(1), " Pizza ")
    await userEvent.type(answerField(2), "Ramen")
    await userEvent.type(answerField(3), "Salad bar")
    await quack()

    expect(mutate).toHaveBeenCalledWith(
      {
        text: "Where do we go for lunch?",
        mood: "happy",
        poll: { answers: ["Pizza", "Ramen", "Salad bar"] },
      },
      expect.anything(),
    )
  })

  it("posts an ordinary quack after the poll is removed, and offers it again", async () => {
    await startPoll("Just a thought")
    await userEvent.type(answerField(1), "Pizza")

    await userEvent.click(button("Remove poll"))

    expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()
    await vi.waitFor(() => expect(button("Add a poll")).toHaveFocus())
    await quack()
    expect(mutate).toHaveBeenCalledWith(
      { text: "Just a thought", mood: undefined, poll: undefined },
      expect.anything(),
    )
  })

  it.each([
    ["", "Answer is required."],
    ["   ", "Answer is required."],
    ["a".repeat(57), "Answer is too long — use at most 50 characters (you have 57)."],
    ["PIZZA", "This answer is the same as answer 1."],
  ])("says what is wrong with an answer of %j, under that answer", async (second, message) => {
    await startPoll()
    await userEvent.type(answerField(1), "Pizza")
    if (second) {
      await userEvent.click(answerField(2))
      await userEvent.paste(second)
    }

    await quack()

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(answerField(2)).toHaveAccessibleDescription(message)
    expect(answerField(1)).not.toHaveAccessibleDescription(message)
    expect(answerField(2)).toHaveValue(second)
    expect(mutate).not.toHaveBeenCalled()
  })

  it("clears 'same as answer 1' when answer 1 changes", async () => {
    await startPoll()
    await userEvent.type(answerField(1), "Pizza")
    await userEvent.type(answerField(2), "pizza")
    await quack()
    expect(await screen.findByText("This answer is the same as answer 1.")).toBeInTheDocument()

    await userEvent.type(answerField(1), "s")

    await vi.waitFor(() =>
      expect(screen.queryByText("This answer is the same as answer 1.")).not.toBeInTheDocument(),
    )
  })

  it("goes back to no poll after posting", async () => {
    mutate.mockImplementation((_values, options: { onSuccess?: () => void }) =>
      options.onSuccess?.(),
    )
    await startPoll()
    await userEvent.type(answerField(1), "Pizza")
    await userEvent.type(answerField(2), "Ramen")

    await quack()

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("New quack")).toHaveValue("")
    expect(screen.queryByLabelText("Answer 1")).not.toBeInTheDocument()
    expect(button("Add a poll")).toBeInTheDocument()
  })
})
