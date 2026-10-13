import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { useVote } from "@/features/quack/hooks/useVote"

const { put } = vi.hoisted(() => ({ put: vi.fn() }))

// The hook is under test, not the network: stub the HTTP client.
vi.mock("@/lib/api-client", () => ({ api: { put } }))

const pollAfterVote = {
  options: [
    { id: "pizza", text: "Pizza", votes: 2 },
    { id: "ramen", text: "Ramen", votes: 2 },
  ],
  totalVotes: 4,
  myOptionId: "ramen",
}

const renderVote = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => useVote("q1"), { wrapper }), invalidate }
}

describe("useVote", () => {
  beforeEach(() => {
    put.mockReset()
  })

  it("sends my answer for this poll, then refreshes every feed list", async () => {
    put.mockReturnValue({ json: () => Promise.resolve(pollAfterVote) })
    const { result, invalidate } = renderVote()

    result.current.mutate("ramen")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(put).toHaveBeenCalledWith("quacks/q1/vote", { json: { optionId: "ramen" } })
    expect(result.current.data).toEqual(pollAfterVote)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.lists() })
  })

  it("reports a vote that wasn't saved", async () => {
    put.mockReturnValue({ json: () => Promise.reject(new Error("Network error")) })
    const { result, invalidate } = renderVote()

    result.current.mutate("ramen")

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).not.toHaveBeenCalled()
  })
})
