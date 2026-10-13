import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { QuackPoll as QuackPollData } from "@/features/quack/api/quackSchemas"
import { QuackPoll } from "@/features/quack/components/QuackPoll"

const lunchPoll = (votes: [number, number, number]): QuackPollData => ({
  options: [
    { id: "o1", text: "Pizza", votes: votes[0] },
    { id: "o2", text: "Ramen", votes: votes[1] },
    { id: "o3", text: "Salad bar", votes: votes[2] },
  ],
  totalVotes: votes[0] + votes[1] + votes[2],
})

const answerRows = () => screen.getAllByRole("listitem").map((row) => row.textContent)

describe("QuackPoll", () => {
  it("shows each answer in order with its votes and whole-number share", () => {
    render(<QuackPoll poll={lunchPoll([2, 1, 0])} />)

    expect(answerRows()).toEqual([
      "Pizza2 votes · 67%",
      "Ramen1 vote · 33%",
      "Salad bar0 votes · 0%",
    ])
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("sizes each bar by its share", () => {
    render(<QuackPoll poll={lunchPoll([2, 1, 0])} />)

    const bars = screen
      .getAllByRole("listitem")
      .map((row) => row.querySelector<HTMLElement>("[style]")?.style.width)
    expect(bars).toEqual(["67%", "33%", "0%"])
  })

  it("says when nobody has voted yet", () => {
    render(<QuackPoll poll={lunchPoll([0, 0, 0])} />)

    expect(screen.getByText("No votes yet")).toBeInTheDocument()
    expect(screen.getAllByText("0 votes · 0%")).toHaveLength(3)
  })

  it("says 1 vote, not 1 votes", () => {
    render(<QuackPoll poll={lunchPoll([0, 1, 0])} />)

    expect(screen.getAllByText("1 vote")).toHaveLength(1)
    expect(screen.getByText("1 vote · 100%")).toBeInTheDocument()
  })
})
