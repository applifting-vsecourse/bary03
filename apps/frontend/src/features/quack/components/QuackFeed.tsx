import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

import type { QuackFilter } from "@/features/quack/api/quackKeys"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearchField } from "@/features/quack/components/QuackSearchField"

// Long enough that typing a word sends one request, short enough to feel live.
export const SEARCH_DEBOUNCE_MS = 300

const FILTERS: { value: QuackFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
]

const isQuackFilter = (value: string): value is QuackFilter =>
  FILTERS.some((filter) => filter.value === value)

type QuackFeedProps = {
  /** The signed-in user: their quacks get a delete action. */
  viewerId?: string
  /** The signed-in user's role: a moderator gets a delete action on every quack. */
  viewerRole?: string
  /** Takes the user to the post form, from Mine when they have no quacks yet. */
  onWriteFirst?: () => void
}

// The search and the tab live in component state only: a reload starts with
// the full feed.
export function QuackFeed({ viewerId, viewerRole, onWriteFirst }: QuackFeedProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<QuackFilter>("all")
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const quacksQuery = useQuery(quacksQueryOptions(debouncedSearch, filter))

  const hasNoQuacksOfMine = filter === "mine" && !debouncedSearch

  const emptyMessage = debouncedSearch
    ? filter === "mine"
      ? "None of your quacks match your search."
      : "No posts match your search."
    : hasNoQuacksOfMine
      ? "You haven't posted any quacks yet."
      : undefined

  const list = (
    <QuackList
      quacks={quacksQuery.data ?? []}
      isLoading={quacksQuery.isLoading}
      error={quacksQuery.error ?? undefined}
      emptyMessage={emptyMessage}
      emptyAction={
        hasNoQuacksOfMine && onWriteFirst ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onWriteFirst}
          >
            Write your first quack
          </Button>
        ) : undefined
      }
      viewerId={viewerId}
      viewerRole={viewerRole}
      // Only the error state offers a retry — posting invalidates the list,
      // and refocusing the tab refetches it.
      onReload={() => void quacksQuery.refetch()}
    />
  )

  return (
    <Tabs
      value={filter}
      onValueChange={(value) => {
        if (isQuackFilter(value)) setFilter(value)
      }}
      className="gap-4"
    >
      <TabsList aria-label="Which quacks to show">
        {FILTERS.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <QuackSearchField
        value={search}
        onChange={setSearch}
      />

      {/* Only the selected tab's content is mounted, so the list renders once. */}
      {FILTERS.map(({ value }) => (
        <TabsContent
          key={value}
          value={value}
        >
          {list}
        </TabsContent>
      ))}
    </Tabs>
  )
}
