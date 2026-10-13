import { api } from "@/lib/api-client"

import { quackPollSchema, type QuackPoll } from "@/features/quack/api/quackSchemas"

export type VoteInput = {
  quackId: string
  optionId: string
  /** Random id of this browser tab, made once per page load. */
  clientId: string
  /** This tab's click counter; the server ignores a vote older than the one it has. */
  clientSeq: number
}

/** Sets my vote in a poll (replacing any earlier one) and returns the poll as it is now. */
export async function votePoll({ quackId, ...vote }: VoteInput): Promise<QuackPoll> {
  const json = await api.put(`quacks/${quackId}/vote`, { json: vote }).json()
  return quackPollSchema.parse(json)
}
