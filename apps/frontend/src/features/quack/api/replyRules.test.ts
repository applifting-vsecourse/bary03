import { describe, expect, it } from "vitest"

import { replyTextProblem } from "@/features/quack/api/replyRules"

// The backend's reply-rules.spec.ts runs the same cases; keep them in step.
describe("replyTextProblem", () => {
  it.each(["a", "ok but who reflects the pond", "a".repeat(280), "🦆".repeat(280)])(
    "accepts %j",
    (value) => {
      expect(replyTextProblem(value)).toBeUndefined()
    },
  )

  it.each([
    ["", "Reply can't be empty — write something first."],
    ["a".repeat(312), "Reply is too long — use at most 280 characters (you have 312)."],
    ["🦆".repeat(281), "Reply is too long — use at most 280 characters (you have 281)."],
  ])("rejects %j", (value, message) => {
    expect(replyTextProblem(value)).toBe(message)
  })
})
