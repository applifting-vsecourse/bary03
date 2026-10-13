import { api } from "@/lib/api-client"

import { quackPollSchema, type QuackPoll } from "@/features/quack/api/quackSchemas"

/** Sets my vote in a poll (replacing any earlier one) and returns the poll after it. */
export async function votePoll(input: { quackId: string; optionId: string }): Promise<QuackPoll> {
  const json = await api
    .put(`quacks/${input.quackId}/vote`, { json: { optionId: input.optionId } })
    .json()
  return quackPollSchema.parse(json)
}
