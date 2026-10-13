import { z } from "zod"

import { moodSchema } from "@/lib/moods"

export const settingsSchema = z.object({
  username: z.string(),
  name: z.string(),
  bio: z.string().nullable(),
  defaultMood: moodSchema.nullable(),
})

export type Settings = z.infer<typeof settingsSchema>
