import { FormControl } from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { moods, moodSchema, type Mood } from "@/lib/moods"

// Radix Select can't hold an empty value, so "no mood" gets its own sentinel.
const NO_MOOD = "none"

type MoodSelectProps = {
  value: Mood | undefined
  onChange: (mood: Mood | undefined) => void
  isDisabled?: boolean
}

/** The mood picker for a react-hook-form field; render it inside a FormItem. */
export function MoodSelect({ value, onChange, isDisabled }: MoodSelectProps) {
  return (
    <Select
      value={value ?? NO_MOOD}
      onValueChange={(next) => onChange(next === NO_MOOD ? undefined : moodSchema.parse(next))}
      disabled={isDisabled}
    >
      <FormControl>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value={NO_MOOD}>No mood</SelectItem>
        {moodSchema.options.map((mood) => (
          <SelectItem
            key={mood}
            value={mood}
          >
            <span aria-hidden="true">{moods[mood].emoji}</span>
            {moods[mood].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
