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
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: quackMoodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  // null when the quack is not a poll
  poll: quackPollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type QuackMood = z.infer<typeof quackMoodSchema>

export type QuackPoll = z.infer<typeof quackPollSchema>

export type Quack = z.infer<typeof quackSchema>
