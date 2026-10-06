import type { QuackMood } from "@/features/quack/api/quackSchemas"

// One place for how a mood reads on screen — used by both the form and the feed.
export const quackMoods: Record<QuackMood, { emoji: string; label: string }> = {
  happy: { emoji: "😄", label: "Happy" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
  silly: { emoji: "🤪", label: "Silly" },
}
