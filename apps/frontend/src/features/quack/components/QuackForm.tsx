import { useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ListChecks, Loader2 } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"

import { MoodSelect } from "@/components/MoodSelect"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { QuackMood } from "@/features/quack/api/quackSchemas"
import {
  MAX_LENGTH,
  quackFormSchema,
  type QuackFormValues,
} from "@/features/quack/components/quackFormSchema"
import { QuackPollFields } from "@/features/quack/components/QuackPollFields"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

type QuackFormProps = {
  /** The mood the form starts with, and returns to after posting. */
  defaultMood?: QuackMood
  className?: string
}

export function QuackForm({ defaultMood, className }: QuackFormProps) {
  const addQuack = useAddQuack()
  const form = useForm<QuackFormValues>({
    resolver: zodResolver(quackFormSchema),
    defaultValues: { text: "", mood: defaultMood, answers: [] },
  })
  const answers = useFieldArray({ control: form.control, name: "answers" })
  const addPollButton = useRef<HTMLButtonElement>(null)

  // The default can arrive (or change) after the form mounts. Adopt it unless
  // the user has already picked a mood for this post.
  useEffect(() => {
    form.reset(
      { text: "", mood: defaultMood, answers: [] },
      { keepDirtyValues: true, keepErrors: true },
    )
  }, [defaultMood, form])

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0
  const hasPoll = answers.fields.length > 0

  // After a failed submit, re-check every answer when one changes or goes:
  // fixing answer 1 can clear "same as answer 1" on answer 3.
  const recheckAnswers = () => {
    if (form.formState.isSubmitted) void form.trigger("answers")
  }

  const handleRemovePoll = () => {
    answers.replace([])
    // The fields (and the focus with them) are gone; put focus somewhere useful.
    requestAnimationFrame(() => addPollButton.current?.focus())
  }

  const handleSubmit = (values: QuackFormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood,
        poll: values.answers.length
          ? { answers: values.answers.map((answer) => answer.value) }
          : undefined,
      },
      { onSuccess: () => form.reset() },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>New quack</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Quack something..."
                    disabled={addQuack.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem className="sm:w-40">
                <FormLabel>Mood</FormLabel>
                <MoodSelect
                  value={field.value}
                  onChange={field.onChange}
                  isDisabled={addQuack.isPending}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {hasPoll ? (
          <QuackPollFields
            control={form.control}
            fields={answers.fields}
            onAddAnswer={() => {
              answers.append({ value: "" })
              recheckAnswers()
            }}
            onRemoveAnswer={(index) => {
              answers.remove(index)
              recheckAnswers()
            }}
            onRemovePoll={handleRemovePoll}
            onAnswerChange={recheckAnswers}
            isDisabled={addQuack.isPending}
          />
        ) : null}

        <div className="flex items-center gap-3">
          {hasPoll ? null : (
            <Button
              ref={addPollButton}
              type="button"
              variant="outline"
              size="sm"
              disabled={addQuack.isPending}
              // Two empty answers to start with; the cursor goes to the first.
              onClick={() => answers.append([{ value: "" }, { value: "" }], { focusIndex: 0 })}
            >
              <ListChecks />
              Add a poll
            </Button>
          )}
          <span
            className={cn(
              "ml-auto text-sm",
              length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={addQuack.isPending}
          >
            {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quack
          </Button>
        </div>
      </form>
    </Form>
  )
}
