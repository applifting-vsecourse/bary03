import { Plus, X } from "lucide-react"
import type { Control, FieldArrayWithId } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { POLL_MAX_ANSWERS, POLL_MIN_ANSWERS } from "@/features/quack/api/pollRules"
import type { QuackFormValues } from "@/features/quack/components/quackFormSchema"

type QuackPollFieldsProps = {
  control: Control<QuackFormValues>
  fields: FieldArrayWithId<QuackFormValues, "answers">[]
  onAddAnswer: () => void
  onRemoveAnswer: (index: number) => void
  onRemovePoll: () => void
  /** Called after an answer changes, so "same as answer 1" updates on the others. */
  onAnswerChange: () => void
  isDisabled: boolean
}

/** The poll's answer fields: 2–4 labelled inputs, plus add/remove controls. */
export function QuackPollFields({
  control,
  fields,
  onAddAnswer,
  onRemoveAnswer,
  onRemovePoll,
  onAnswerChange,
  isDisabled,
}: QuackPollFieldsProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium">Poll</legend>

      {fields.map((item, index) => (
        <FormField
          key={item.id}
          control={control}
          name={`answers.${index}.value`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Answer {index + 1}</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    disabled={isDisabled}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event)
                      onAnswerChange()
                    }}
                  />
                </FormControl>
                {fields.length > POLL_MIN_ANSWERS ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove answer ${index + 1}`}
                    disabled={isDisabled}
                    onClick={() => onRemoveAnswer(index)}
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}

      <div className="flex flex-wrap gap-2">
        {fields.length < POLL_MAX_ANSWERS ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDisabled}
            onClick={onAddAnswer}
          >
            <Plus />
            Add an answer
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isDisabled}
          onClick={onRemovePoll}
        >
          Remove poll
        </Button>
      </div>
    </fieldset>
  )
}
