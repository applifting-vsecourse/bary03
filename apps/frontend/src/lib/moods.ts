import { z } from "zod"

// Moods are shared by posting (a quack's mood) and settings (the default mood),
// so they live outside both features.
export const moodSchema = z.enum(["happy", "sad", "angry", "silly"])

export type Mood = z.infer<typeof moodSchema>

// One place for how a mood reads on screen.
export const moods: Record<Mood, { emoji: string; label: string }> = {
  happy: { emoji: "😄", label: "Happy" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
  silly: { emoji: "🤪", label: "Silly" },
}
