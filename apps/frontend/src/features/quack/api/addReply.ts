import { api } from "@/lib/api-client"

import { replySchema, type Reply } from "@/features/quack/api/quackSchemas"

export async function addReply(input: { quackId: string; text: string }): Promise<Reply> {
  const json = await api
    .post(`quacks/${input.quackId}/replies`, { json: { text: input.text } })
    .json()
  return replySchema.parse(json)
}
