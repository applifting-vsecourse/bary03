import type { QuackMood } from "@/features/quack/api/quackSchemas"
import { quackMoods } from "@/features/quack/components/quackMoods"

type QuackMoodLabelProps = { mood: QuackMood }

export function QuackMoodLabel({ mood }: QuackMoodLabelProps) {
  const { emoji, label } = quackMoods[mood]

  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true">{emoji}</span>
      {label}
    </span>
  )
}
