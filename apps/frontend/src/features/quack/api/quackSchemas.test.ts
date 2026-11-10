import { describe, expect, it } from "vitest"

import { quackSchema } from "@/features/quack/api/quackSchemas"

const placeholder = {
  id: "q1",
  deleted: true,
  text: null,
  mood: null,
  userId: null,
  createdAt: "2026-01-01T12:00:00Z",
  user: null,
  poll: null,
  replyCount: 2,
}

describe("quackSchema", () => {
  it("reads a deleted quack kept for its replies", () => {
    expect(quackSchema.parse(placeholder)).toMatchObject({ deleted: true, replyCount: 2 })
  })

  // The server erases these (docs/adr/0001). If one ever came back, showing
  // it would leak what was deleted, so the payload is refused instead.
  it.each([
    ["text", "If a pond reflects the sky…"],
    ["mood", "sad"],
    ["userId", "u1"],
    ["user", { id: "u1", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" }],
    ["poll", { options: [], totalVotes: 0, myOptionId: null }],
  ])("refuses a deleted quack that still carries its %s", (field, value) => {
    expect(quackSchema.safeParse({ ...placeholder, [field]: value }).success).toBe(false)
  })
})
