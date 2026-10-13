import { moods } from "@/lib/moods"

import type { QuackMood } from "@/features/quack/api/quackSchemas"

type QuackMoodLabelProps = { mood: QuackMood }

export function QuackMoodLabel({ mood }: QuackMoodLabelProps) {
  const { emoji, label } = moods[mood]

  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true">{emoji}</span>
      {label}
    </span>
  )
}
