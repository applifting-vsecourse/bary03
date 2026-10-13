import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { QuackPoll as QuackPollData } from "@/features/quack/api/quackSchemas"
import { QuackPoll } from "@/features/quack/components/QuackPoll"

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))
const vote = { mutate, isPending: false, isError: false }

// The poll is under test, not the network: stub the mutation hook.
vi.mock("@/features/quack/hooks/useVote", () => ({ useVote: () => vote }))

const lunchPoll = (
  votes: [number, number, number],
  myOptionId: string | null = null,
): QuackPollData => ({
  options: [
    { id: "pizza", text: "Pizza", votes: votes[0] },
    { id: "ramen", text: "Ramen", votes: votes[1] },
    { id: "salad", text: "Salad bar", votes: votes[2] },
  ],
  totalVotes: votes[0] + votes[1] + votes[2],
  myOptionId,
})

const renderPoll = (poll: QuackPollData) =>
  render(
    <QuackPoll
      quackId="q1"
      poll={poll}
    />,
  )

const answer = (name: RegExp) => screen.getByRole("button", { name })

describe("QuackPoll", () => {
  beforeEach(() => {
    mutate.mockReset()
    vote.isPending = false
    vote.isError = false
  })

  it("shows each answer in order with its votes and whole-number share", () => {
    renderPoll(lunchPoll([2, 1, 0]))

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Pizza2 votes · 67%",
      "Ramen1 vote · 33%",
      "Salad bar0 votes · 0%",
    ])
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("sizes each bar by its share", () => {
    renderPoll(lunchPoll([2, 1, 0]))

    const bars = screen
      .getAllByRole("button")
      .map((button) => button.querySelector<HTMLElement>("[style]")?.style.width)
    expect(bars).toEqual(["67%", "33%", "0%"])
  })

  it("says when nobody has voted yet", () => {
    renderPoll(lunchPoll([0, 0, 0]))

    expect(screen.getByText("No votes yet")).toBeInTheDocument()
    expect(screen.getAllByText("0 votes · 0%")).toHaveLength(3)
  })

  it("says 1 vote, not 1 votes", () => {
    renderPoll(lunchPoll([0, 1, 0]))

    expect(screen.getAllByText("1 vote")).toHaveLength(1)
    expect(screen.getByText("1 vote · 100%")).toBeInTheDocument()
  })

  it("marks nothing before I vote", () => {
    renderPoll(lunchPoll([2, 1, 0]))

    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-pressed", "false")
    }
  })

  it("marks my answer", () => {
    renderPoll(lunchPoll([2, 1, 0], "pizza"))

    expect(answer(/^Pizza/)).toHaveAttribute("aria-pressed", "true")
    expect(answer(/^Ramen/)).toHaveAttribute("aria-pressed", "false")
    expect(answer(/^Pizza/).querySelector("svg")).toBeInTheDocument()
    expect(answer(/^Ramen/).querySelector("svg")).not.toBeInTheDocument()
  })

  it("votes for the answer I click", async () => {
    renderPoll(lunchPoll([2, 1, 0]))

    await userEvent.click(answer(/^Salad bar/))

    expect(mutate).toHaveBeenCalledWith("salad")
  })

  it("moves my vote to another answer", async () => {
    renderPoll(lunchPoll([2, 1, 0], "pizza"))

    await userEvent.click(answer(/^Ramen/))

    expect(mutate).toHaveBeenCalledWith("ramen")
  })

  it("does nothing when I pick my current answer again", async () => {
    renderPoll(lunchPoll([2, 1, 0], "pizza"))

    await userEvent.click(answer(/^Pizza/))

    expect(mutate).not.toHaveBeenCalled()
  })

  it("waits for a vote to be saved before taking another", () => {
    vote.isPending = true
    renderPoll(lunchPoll([2, 1, 0]))

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled()
    }
  })

  it("says when a vote wasn't saved", () => {
    vote.isError = true
    renderPoll(lunchPoll([2, 1, 0]))

    expect(screen.getByRole("alert")).toHaveTextContent("Your vote wasn't saved. Try again.")
  })
})
