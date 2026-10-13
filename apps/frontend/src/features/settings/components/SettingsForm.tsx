import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { MoodSelect } from "@/components/MoodSelect"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { moodSchema } from "@/lib/moods"
import { cn } from "@/lib/utils"

import {
  BIO_MAX_LENGTH,
  bioProblem,
  lengthOf,
  nameProblem,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  usernameProblem,
} from "@/features/settings/api/settingsRules"
import { type Settings } from "@/features/settings/api/settingsSchemas"
import { UsernameTakenError } from "@/features/settings/api/updateSettings"
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings"

const USERNAME_HINT = `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters: letters, numbers, dots and underscores.`

// Trims, then reports the one thing the rule says is wrong.
const checkedText = (problem: (value: string) => string | undefined) =>
  z
    .string()
    .trim()
    .superRefine((value, context) => {
      const message = problem(value)
      if (message) context.addIssue({ code: "custom", message })
    })

const schema = z.object({
  username: checkedText(usernameProblem),
  name: checkedText(nameProblem),
  bio: checkedText(bioProblem),
  defaultMood: moodSchema.optional(),
})

type FormValues = z.infer<typeof schema>

const toFormValues = (settings: Settings): FormValues => ({
  username: settings.username,
  name: settings.name,
  bio: settings.bio ?? "",
  defaultMood: settings.defaultMood ?? undefined,
})

type SettingsFormProps = {
  /** What is saved now: the form starts here and Discard returns here. */
  settings: Settings
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const updateSettings = useUpdateSettings()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(settings),
  })

  const bio = useWatch({ control: form.control, name: "bio" })
  const bioLength = lengthOf(bio ?? "")

  const handleSubmit = (values: FormValues) => {
    updateSettings.mutate(
      {
        username: values.username,
        name: values.name,
        bio: values.bio || null,
        defaultMood: values.defaultMood ?? null,
      },
      {
        onSuccess: (saved) => {
          // What was just saved is the new baseline for Discard.
          form.reset(toFormValues(saved))
          toast.success("Settings saved")
        },
        onError: (error) => {
          // Keep what they typed; say why next to the field.
          if (error instanceof UsernameTakenError) {
            form.setError("username", { message: error.message }, { shouldFocus: true })
          }
        },
      },
    )
  }

  const handleDiscard = () => {
    form.reset()
    updateSettings.reset()
  }

  const isPending = updateSettings.isPending
  const otherError =
    updateSettings.error && !(updateSettings.error instanceof UsernameTakenError)
      ? updateSettings.error
      : null

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-6"
      >
        {otherError ? (
          <Alert variant="destructive">
            <AlertDescription>{otherError.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              {/* An error says what to fix; the hint would only repeat it. */}
              {fieldState.error ? (
                <FormMessage />
              ) : (
                <FormDescription>{USERNAME_HINT}</FormDescription>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="e.g. Rating every loaf in the pond."
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between gap-3">
                <FormDescription>Optional.</FormDescription>
                <span
                  className={cn(
                    "text-sm",
                    bioLength > BIO_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bioLength}/{BIO_MAX_LENGTH}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem className="sm:w-60">
              <FormLabel>Default mood</FormLabel>
              <MoodSelect
                value={field.value}
                onChange={field.onChange}
                isDisabled={isPending}
              />
              <FormDescription>New posts start with this mood.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={isPending || !form.formState.isDirty}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
