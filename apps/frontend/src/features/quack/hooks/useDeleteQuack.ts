import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteQuack,
    // Not optimistic, but the dialog waits on it: paused while offline, it
    // would spin forever. Always send, so offline fails at once with a message.
    networkMode: "always",
    onSuccess: async (_data, quackId) => {
      // Take it off every cached list (All, Mine, any search) straight away,
      // then refetch so the lists match the server.
      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
        quacks?.filter((quack) => quack.id !== quackId),
      )
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
