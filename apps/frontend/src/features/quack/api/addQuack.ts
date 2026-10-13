import { api } from "@/lib/api-client"

import { quackSchema, type Quack, type QuackMood } from "@/features/quack/api/quackSchemas"

export async function addQuack(input: {
  text: string
  mood?: QuackMood
  /** Makes the quack a poll; omit for an ordinary quack. */
  poll?: { answers: string[] }
}): Promise<Quack> {
  const json = await api.post("quacks", { json: input }).json()
  return quackSchema.parse(json)
}
