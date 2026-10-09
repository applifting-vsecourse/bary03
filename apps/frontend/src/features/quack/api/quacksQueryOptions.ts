import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

// An empty search is the full feed. The server trims the phrase and drops a
// leading @ too; the client only skips sending a blank one.
export const quacksQueryOptions = (search = "") =>
  queryOptions({
    queryKey: quackKeys.list(search),
    queryFn: async () =>
      quacksSchema.parse(
        await api.get("quacks", { searchParams: search ? { q: search } : undefined }).json(),
      ),
    // Keep the current posts on screen while the next search loads.
    placeholderData: keepPreviousData,
  })
