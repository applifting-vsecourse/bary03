import { useMutation, useQueryClient } from "@tanstack/react-query"

import { settingsKeys } from "@/features/settings/api/settingsKeys"
import { updateSettings } from "@/features/settings/api/updateSettings"

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: async (settings) => {
      queryClient.setQueryData(settingsKeys.all(), settings)
      // The name and @username appear in the header menu (session) and on
      // every quack, and features don't know each other's query keys — so
      // refresh everything rather than miss a place.
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== settingsKeys.all()[0],
      })
    },
  })
}
