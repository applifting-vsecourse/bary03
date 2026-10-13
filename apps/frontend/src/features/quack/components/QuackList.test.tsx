// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

// A list renders polls, and a poll votes through this hook; stub it.
vi.mock("@/features/quack/hooks/useVote", () => ({
  useVote: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows the mood of a quack that has one", () => {
    render(<QuackList quacks={[quack({ mood: "angry" })]} />)

    expect(screen.getByText("Angry")).toBeInTheDocument()
  })

  it("shows no mood for a quack without one", () => {
    render(<QuackList quacks={[quack()]} />)

    for (const label of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it("shows a poll under the question", () => {
    render(
      <QuackList
        quacks={[
          quack({
            text: "Where do we go for lunch?",
            poll: {
              options: [
                { id: "o1", text: "Pizza", votes: 2 },
                { id: "o2", text: "Ramen", votes: 1 },
              ],
              totalVotes: 3,
              myOptionId: null,
            },
          }),
        ]}
      />,
    )

    expect(screen.getByText("Where do we go for lunch?")).toBeInTheDocument()
    expect(screen.getByText("Pizza")).toBeInTheDocument()
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("shows no poll for an ordinary quack", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.queryByText(/votes?$/)).not.toBeInTheDocument()
  })

  it("says the feed is empty when there are no quacks", () => {
    render(<QuackList quacks={[]} />)

    expect(screen.getByText("No quacks yet. Post the first one.")).toBeInTheDocument()
  })

  it("shows a custom empty message", () => {
    render(
      <QuackList
        quacks={[]}
        emptyMessage="No posts match your search."
      />,
    )

    expect(screen.getByText("No posts match your search.")).toBeInTheDocument()
    expect(screen.queryByText("No quacks yet. Post the first one.")).not.toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})
