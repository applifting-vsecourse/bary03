import { describe, expect, it } from "vitest"

import { answerCountProblem, answerProblem } from "@/features/quack/api/pollRules"

// The backend's poll-rules.spec.ts runs the same cases; keep them in step.
describe("answerProblem", () => {
  it.each([
    [["Pizza", "Ramen"], 1],
    [["a".repeat(50), "Ramen"], 0],
    [["🦆".repeat(50), "Ramen"], 0],
  ])("accepts answer %#", (answers, index) => {
    expect(answerProblem(answers, index)).toBeUndefined()
  })

  it.each([
    [["Pizza", ""], 1, "Answer is required."],
    [["a".repeat(57), "Ramen"], 0, "Answer is too long — use at most 50 characters (you have 57)."],
    [["Pizza", "pizza"], 1, "This answer is the same as answer 1."],
    [["Pizza", "Ramen", "RAMEN"], 2, "This answer is the same as answer 2."],
  ])("says what is wrong with answer %#", (answers, index, message) => {
    expect(answerProblem(answers, index)).toBe(message)
  })

  it("flags only the later of two equal answers", () => {
    expect(answerProblem(["Pizza", "pizza"], 0)).toBeUndefined()
  })

  it("says an answer is required before comparing it with others", () => {
    expect(answerProblem(["", ""], 1)).toBe("Answer is required.")
  })
})

describe("answerCountProblem", () => {
  it.each([2, 3, 4])("accepts %d answers", (count) => {
    expect(answerCountProblem(count)).toBeUndefined()
  })

  it.each([
    [0, "A poll needs at least 2 answers."],
    [1, "A poll needs at least 2 answers."],
    [5, "A poll can have at most 4 answers."],
  ])("rejects %d answers", (count, message) => {
    expect(answerCountProblem(count)).toBe(message)
  })
})
