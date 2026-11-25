import { describe, expect, it } from "vitest"

import { quackSchema, replySchema } from "@/features/quack/api/quackSchemas"

const live = {
  id: "q1",
  deleted: false,
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: "2026-01-01T12:00:00Z",
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  replyCount: 0,
  likes: { count: 3, likedByMe: true },
}

const placeholder = {
  id: "q2",
  deleted: true,
  text: null,
  mood: null,
  userId: null,
  createdAt: "2026-01-01T12:00:00Z",
  user: null,
  poll: null,
  replyCount: 2,
  likes: null,
}

const reply = {
  id: "r1",
  text: "a reply",
  parentId: "q1",
  userId: "u2",
  createdAt: "2026-01-01T12:05:00Z",
  user: { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
  likes: { count: 1, likedByMe: false },
}

describe("likes in the quack payloads", () => {
  it("reads a quack's count and whether I liked it (R1, R14)", () => {
    expect(quackSchema.parse(live)).toMatchObject({ likes: { count: 3, likedByMe: true } })
  })

  it("reads a reply's count and whether I liked it (R9)", () => {
    expect(replySchema.parse(reply)).toMatchObject({ likes: { count: 1, likedByMe: false } })
  })

  it("refuses a quack that comes without its likes", () => {
    const { likes: _likes, ...withoutLikes } = live
    expect(quackSchema.safeParse(withoutLikes).success).toBe(false)
  })

  it("reads a placeholder with no likes (R12)", () => {
    expect(quackSchema.parse(placeholder)).toMatchObject({ deleted: true, likes: null })
  })

  // A placeholder keeps no likes (docs/adr/0002); one that came back with a
  // count would be shown as if the deleted quack were still being liked.
  it("refuses a placeholder that still carries likes (R12)", () => {
    expect(
      quackSchema.safeParse({ ...placeholder, likes: { count: 3, likedByMe: false } }).success,
    ).toBe(false)
  })
})
