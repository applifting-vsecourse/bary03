import { useMutation, useQueryClient } from "@tanstack/react-query"

import { addReply } from "@/features/quack/api/addReply"
import { quackKeys } from "@/features/quack/api/quackKeys"

// Not optimistic: the reply shows up once the server has it. If this ever
// updates the screen first, it needs networkMode: "always" (see useVote).
export function useAddReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addReply,
    onSuccess: async () => {
      // Refresh the feed so the quack's reply count goes up.
      await queryClient.invalidateQueries({ queryKey: quackKeys.lists() })
    },
  })
}
