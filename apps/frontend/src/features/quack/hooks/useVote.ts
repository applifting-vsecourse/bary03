import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack, QuackPoll } from "@/features/quack/api/quackSchemas"
import { votePoll } from "@/features/quack/api/votePoll"

// "My last click wins" (see plan.md). Every click in this tab gets a higher
// number. The server keeps a vote from this tab only if its number is higher
// than the one it has, and here only the reply to a poll's latest click may
// touch the screen, so an older click arriving late can't win either place.
const CLIENT_ID = crypto.randomUUID()
let lastClientSeq = 0

// Per poll, kept outside the component so it survives the poll re-rendering
// in a different feed list (e.g. when the search changes) mid-vote.
type PollVoteState = {
  /** The newest click; only its outcome may change the screen. */
  latestSeq: number
  /** Votes sent but not yet answered. */
  pending: number
  /** The last poll the server confirmed, and which click it answered. */
  confirmed: QuackPoll
  confirmedSeq: number
}
const pollVoteStates = new Map<string, PollVoteState>()

/** The poll with my vote moved to `optionId`: what the server will say, shown before it does. */
export function withMyVote(poll: QuackPoll, optionId: string): QuackPoll {
  if (poll.myOptionId === optionId) return poll
  const hasVotedBefore = poll.myOptionId !== null
  return {
    options: poll.options.map((option) => {
      if (option.id === optionId) return { ...option, votes: option.votes + 1 }
      if (option.id === poll.myOptionId) return { ...option, votes: option.votes - 1 }
      return option
    }),
    totalVotes: hasVotedBefore ? poll.totalVotes : poll.totalVotes + 1,
    myOptionId: optionId,
  }
}

/** Puts `poll` on this quack in every cached feed list: the plain feed and any search. */
const showPoll = (queryClient: QueryClient, quackId: string, poll: QuackPoll) => {
  queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
    quacks?.map((quack) => (quack.id === quackId ? { ...quack, poll } : quack)),
  )
}

/**
 * Votes in one poll. A click shows at once; the server's numbers replace it
 * when the reply to the latest click arrives. If that click fails, the poll
 * goes back to what the server last confirmed and `isError` is set.
 */
export function useVote(quackId: string) {
  const queryClient = useQueryClient()

  const settle = async (state: PollVoteState) => {
    state.pending -= 1
    // Refetch only once nothing is in flight: a refetch that started earlier
    // could answer from before my latest vote and undo it on screen. This also
    // brings in other people's votes.
    if (state.pending === 0) {
      await queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
    }
  }

  const mutation = useMutation({
    mutationFn: votePoll,
    // By default TanStack pauses a mutation while the browser is offline and
    // sends it later. The vote is already on screen, so a paused vote would
    // look saved when it isn't (criterion 22). Always send: offline, the
    // request fails at once, the poll goes back and the message shows.
    networkMode: "always",
    onSuccess: async (poll, { quackId, clientSeq }) => {
      const state = pollVoteStates.get(quackId)
      if (!state) return
      // Replies can arrive out of order; keep the newest one as the fallback.
      if (clientSeq > state.confirmedSeq) {
        state.confirmed = poll
        state.confirmedSeq = clientSeq
      }
      if (clientSeq === state.latestSeq) showPoll(queryClient, quackId, poll)
      await settle(state)
    },
    onError: async (_error, { quackId, clientSeq }) => {
      const state = pollVoteStates.get(quackId)
      if (!state) return
      if (clientSeq === state.latestSeq) showPoll(queryClient, quackId, state.confirmed)
      await settle(state)
    },
  })

  /** Votes for `optionId`; `poll` is the poll as it is on screen now. */
  const vote = (optionId: string, poll: QuackPoll) => {
    const clientSeq = ++lastClientSeq
    const state = pollVoteStates.get(quackId)
    if (state && state.pending > 0) {
      state.latestSeq = clientSeq
      state.pending += 1
    } else {
      // Nothing in flight: what's on screen is what the server last said.
      pollVoteStates.set(quackId, {
        latestSeq: clientSeq,
        pending: 1,
        confirmed: poll,
        confirmedSeq: 0,
      })
    }

    // A feed refetch already on its way could land after this click and undo it.
    void queryClient.cancelQueries({ queryKey: quackKeys.lists() })
    showPoll(queryClient, quackId, withMyVote(poll, optionId))

    // Each click is its own request; the mutation's state follows the latest
    // one, so `isError` only reports a failure of my most recent click.
    mutation.mutate({ quackId, optionId, clientId: CLIENT_ID, clientSeq })
  }

  return { vote, isError: mutation.isError }
}
