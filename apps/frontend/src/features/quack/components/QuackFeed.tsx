import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { useDebouncedValue } from "@/hooks/useDebouncedValue"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearchField } from "@/features/quack/components/QuackSearchField"

// Long enough that typing a word sends one request, short enough to feel live.
export const SEARCH_DEBOUNCE_MS = 300

// The search lives in component state only: a reload starts with the full feed.
export function QuackFeed() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const quacksQuery = useQuery(quacksQueryOptions(debouncedSearch))

  return (
    <div className="flex flex-col gap-4">
      <QuackSearchField
        value={search}
        onChange={setSearch}
      />

      <QuackList
        quacks={quacksQuery.data ?? []}
        isLoading={quacksQuery.isLoading}
        error={quacksQuery.error ?? undefined}
        emptyMessage={debouncedSearch ? "No posts match your search." : undefined}
        // Only the error state offers a retry — posting invalidates the list,
        // and refocusing the tab refetches it.
        onReload={() => void quacksQuery.refetch()}
      />
    </div>
  )
}
