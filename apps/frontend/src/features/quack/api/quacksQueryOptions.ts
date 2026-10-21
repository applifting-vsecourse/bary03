import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys, type QuackFilter } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

// An empty search is the full feed. The server trims the phrase and drops a
// leading @ too; the client only skips sending a blank one. "mine" asks for the
// signed-in user's quacks; the server works out who that is from the session.
export const quacksQueryOptions = (search = "", filter: QuackFilter = "all") =>
  queryOptions({
    queryKey: quackKeys.list(search, filter),
    queryFn: async () => {
      const searchParams = {
        ...(search ? { q: search } : {}),
        ...(filter === "mine" ? { mine: "true" } : {}),
      }
      return quacksSchema.parse(
        await api
          .get("quacks", {
            searchParams: Object.keys(searchParams).length ? searchParams : undefined,
          })
          .json(),
      )
    },
    // Keep the current posts on screen while the next search loads, but not
    // across tabs: All's posts aren't a stand-in for Mine.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2].filter === filter ? previous : undefined,
  })
