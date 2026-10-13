import { useMutation, useQueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { votePoll } from "@/features/quack/api/votePoll"

// One instance per poll, so a failed vote only shows its message on that poll.
export function useVote(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (optionId: string) => votePoll({ quackId, optionId }),
    onSuccess: async () => {
      // Refresh every feed list (plain and searched) so the counts, including
      // other people's votes since, come from the server. Awaiting keeps the
      // vote pending until the new numbers are on screen.
      await queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
    },
  })
}
