import { z } from "zod"

import { answerCountProblem, answerProblem } from "@/features/quack/api/pollRules"
import { quackMoodSchema } from "@/features/quack/api/quackSchemas"

// The post form's fields and rules. In its own file so the form and its poll
// fields share one type.

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
export const MAX_LENGTH = 280

export const quackFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
  mood: quackMoodSchema.optional(),
  // No answers: an ordinary quack. Otherwise the post text is the question.
  // Each problem goes under the answer it belongs to, worded by the shared
  // poll rules the server uses too.
  answers: z.array(z.object({ value: z.string().trim() })).superRefine((answers, context) => {
    if (answers.length === 0) return
    const values = answers.map((answer) => answer.value)
    const countMessage = answerCountProblem(values.length)
    if (countMessage) context.addIssue({ code: "custom", message: countMessage })
    values.forEach((_value, index) => {
      const message = answerProblem(values, index)
      if (message) context.addIssue({ code: "custom", message, path: [index, "value"] })
    })
  }),
})

export type QuackFormValues = z.infer<typeof quackFormSchema>
