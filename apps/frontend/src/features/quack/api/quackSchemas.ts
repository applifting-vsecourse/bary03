import { z } from "zod"

import { moodSchema } from "@/lib/moods"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackMoodSchema = moodSchema

export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const quackPollSchema = z.object({
  // in the order the author typed them
  options: z.array(z.object({ id: z.string(), text: z.string(), votes: z.number() })),
  totalVotes: z.number(),
  // the signed-in user's answer; null until they vote
  myOptionId: z.string().nullable(),
})

export const liveQuackSchema = z.object({
  id: z.string(),
  deleted: z.literal(false),
  text: z.string(),
  mood: quackMoodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  // null when the quack is not a poll
  poll: quackPollSchema.nullable(),
  replyCount: z.number(),
})

// A deleted quack kept for its replies (docs/adr/0001). Its text, mood, poll
// and author were erased on the server; the schema refuses any that come back.
export const deletedQuackSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
  text: z.null(),
  mood: z.null(),
  userId: z.null(),
  createdAt: z.coerce.date(),
  user: z.null(),
  poll: z.null(),
  replyCount: z.number(),
})

export const quackSchema = z.discriminatedUnion("deleted", [liveQuackSchema, deletedQuackSchema])

// A quack posted under another quack: text only, one level deep.
export const replySchema = z.object({
  id: z.string(),
  text: z.string(),
  // the quack this reply answers
  parentId: z.string(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
})

export const quacksSchema = z.array(quackSchema)

export const repliesSchema = z.array(replySchema)

export type QuackMood = z.infer<typeof quackMoodSchema>

export type QuackPoll = z.infer<typeof quackPollSchema>

export type LiveQuack = z.infer<typeof liveQuackSchema>

export type DeletedQuack = z.infer<typeof deletedQuackSchema>

export type Quack = z.infer<typeof quackSchema>

export type Reply = z.infer<typeof replySchema>
