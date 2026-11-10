import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { Textarea } from "@/components/ui/textarea"

import { REPLY_MAX_LENGTH, replyTextProblem } from "@/features/quack/api/replyRules"
import { useAddReply } from "@/features/quack/hooks/useAddReply"

// Worded by the shared reply rules the server uses too.
const replyFormSchema = z.object({
  text: z
    .string()
    .trim()
    .superRefine((value, context) => {
      const message = replyTextProblem(value)
      if (message) context.addIssue({ code: "custom", message })
    }),
})

type ReplyFormValues = z.infer<typeof replyFormSchema>

type QuackReplyFormProps = {
  quackId: string
}

export function QuackReplyForm({ quackId }: QuackReplyFormProps) {
  const addReply = useAddReply()
  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: { text: "" },
  })

  // Opened to write a reply, so the cursor goes straight to the box.
  useEffect(() => {
    form.setFocus("text")
  }, [form])

  const handleSubmit = (values: ReplyFormValues) => {
    // On failure the text stays, so nothing typed is lost.
    addReply.mutate({ quackId, text: values.text }, { onSuccess: () => form.reset() })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-3"
      >
        {addReply.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addReply.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Your reply</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Quack back..."
                  disabled={addReply.isPending}
                  {...field}
                />
              </FormControl>
              {/* An error says what to fix; the hint would only repeat it. */}
              {fieldState.error ? (
                <FormMessage />
              ) : (
                <FormDescription>Up to {REPLY_MAX_LENGTH} characters.</FormDescription>
              )}
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={addReply.isPending}
          >
            {addReply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Post reply
          </Button>
        </div>
      </form>
    </Form>
  )
}
