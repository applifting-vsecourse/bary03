import type { ReactNode } from "react"
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack, QuackPoll } from "@/features/quack/api/quackSchemas"
import { useVote, withMyVote } from "@/features/quack/hooks/useVote"

const { put } = vi.hoisted(() => ({ put: vi.fn() }))

// The hook is under test, not the network: stub the HTTP client.
vi.mock("@/lib/api-client", () => ({ api: { put } }))

const poll = (votes: [number, number, number], myOptionId: string | null = null): QuackPoll => ({
  options: [
    { id: "pizza", text: "Pizza", votes: votes[0] },
    { id: "ramen", text: "Ramen", votes: votes[1] },
    { id: "salad", text: "Salad bar", votes: votes[2] },
  ],
  totalVotes: votes[0] + votes[1] + votes[2],
  myOptionId,
})

const quackWith = (id: string, quackPoll: QuackPoll): Quack => ({
  id,
  text: "Where do we go for lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: quackPoll,
})

// Each request stays open until the test answers it, so the test decides the
// order replies arrive in.
type Request = { optionId: string; clientId: string; clientSeq: number }
let requests: { body: Request; succeed: (p: QuackPoll) => void; fail: () => void }[] = []

let quackCounter = 0

const setup = (start: QuackPoll) => {
  // A fresh poll per test: the hook keeps per-poll state between renders.
  const quackId = `q${++quackCounter}`
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  // The poll shows up in the plain feed and in a search at the same time.
  queryClient.setQueryData(quackKeys.list(""), [quackWith(quackId, start)])
  queryClient.setQueryData(quackKeys.list("lunch"), [quackWith(quackId, start)])
  const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useVote(quackId), { wrapper })

  const shown = (search = "") =>
    queryClient.getQueryData<Quack[]>(quackKeys.list(search))?.[0]?.poll
  // The request goes out a tick after the click; wait for it to be sent.
  const click = async (optionId: string) => {
    const sent = requests.length
    act(() => hook.result.current.vote(optionId, shown()!))
    await waitFor(() => expect(requests).toHaveLength(sent + 1))
  }
  const answer = async (index: number, outcome: QuackPoll | "fail") => {
    const request = requests.at(index)
    if (!request) throw new Error(`No request #${index} was sent`)
    await act(async () => {
      if (outcome === "fail") request.fail()
      else request.succeed(outcome)
      await Promise.resolve()
    })
  }
  return { hook, shown, click, answer, invalidate }
}

describe("withMyVote", () => {
  it("adds my first vote", () => {
    expect(withMyVote(poll([2, 1, 0]), "salad")).toEqual(poll([2, 1, 1], "salad"))
  })

  it("moves my vote without changing the total", () => {
    expect(withMyVote(poll([2, 1, 1], "salad"), "pizza")).toEqual(poll([3, 1, 0], "pizza"))
  })

  it("changes nothing when I pick my current answer", () => {
    const current = poll([2, 1, 0], "pizza")
    expect(withMyVote(current, "pizza")).toBe(current)
  })
})

describe("useVote", () => {
  afterEach(() => {
    onlineManager.setOnline(true)
  })

  beforeEach(() => {
    requests = []
    put.mockReset()
    put.mockImplementation((_path: string, { json }: { json: Request }) => ({
      json: () =>
        new Promise((resolve, reject) => {
          requests.push({ body: json, succeed: resolve, fail: () => reject(new Error("offline")) })
        }),
    }))
  })

  it("shows my vote at once, in every feed list, before the server answers", () => {
    const { hook, shown } = setup(poll([2, 1, 0]))

    act(() => hook.result.current.vote("salad", shown()!))

    expect(shown()).toEqual(poll([2, 1, 1], "salad"))
    expect(shown("lunch")).toEqual(poll([2, 1, 1], "salad"))
  })

  it("numbers each click higher, from the same tab", async () => {
    const { click } = setup(poll([2, 1, 0]))

    await click("salad")
    await click("pizza")

    const bodies = requests.map((request) => request.body)
    expect(bodies.map((body) => body.optionId)).toEqual(["salad", "pizza"])
    expect(new Set(bodies.map((body) => body.clientId)).size).toBe(1)
    const [firstSeq = 0, secondSeq = 0] = bodies.map((body) => body.clientSeq)
    expect(secondSeq).toBeGreaterThan(firstSeq)
  })

  it("shows the server's numbers once my vote is saved, then refreshes the feed", async () => {
    const { click, answer, shown, invalidate } = setup(poll([2, 1, 0]))

    await click("salad")
    // someone else voted Pizza in the meantime
    await answer(0, poll([3, 1, 1], "salad"))

    expect(shown()).toEqual(poll([3, 1, 1], "salad"))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.lists() })
  })

  it("keeps my last click when the replies arrive in the wrong order", async () => {
    const { click, answer, shown, invalidate } = setup(poll([2, 1, 0]))

    await click("pizza") // request 0
    await click("ramen") // request 1
    expect(shown()).toEqual(poll([2, 2, 0], "ramen"))

    // the newer click's reply arrives first...
    await answer(1, poll([2, 2, 0], "ramen"))
    expect(shown()).toEqual(poll([2, 2, 0], "ramen"))
    expect(invalidate).not.toHaveBeenCalled()

    // ...then the older one's. It must not flip the screen back to Pizza.
    await answer(0, poll([3, 1, 0], "pizza"))
    expect(shown()).toEqual(poll([2, 2, 0], "ramen"))
    // only now is nothing in flight, so the feed is refreshed
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it("goes back to how it was and says so when my vote isn't saved", async () => {
    const { click, answer, shown, hook, invalidate } = setup(poll([2, 1, 0]))

    await click("salad")
    await answer(0, "fail")

    expect(shown()).toEqual(poll([2, 1, 0]))
    expect(shown("lunch")).toEqual(poll([2, 1, 0]))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it("goes back to the last vote the server saved when only my latest click fails", async () => {
    const { click, answer, shown, hook } = setup(poll([2, 1, 0]))

    await click("pizza") // saved
    await click("ramen") // fails
    await answer(0, poll([3, 1, 0], "pizza"))
    await answer(1, "fail")

    expect(shown()).toEqual(poll([3, 1, 0], "pizza"))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
  })

  it("doesn't complain about an older click failing when my latest one is saved", async () => {
    const { click, answer, shown, hook } = setup(poll([2, 1, 0]))

    await click("pizza") // fails
    await click("ramen") // saved
    await answer(1, poll([2, 2, 0], "ramen"))
    await answer(0, "fail")

    expect(shown()).toEqual(poll([2, 2, 0], "ramen"))
    await waitFor(() => expect(hook.result.current.isError).toBe(false))
  })

  it("clears the message on my next click", async () => {
    const { click, answer, hook } = setup(poll([2, 1, 0]))

    await click("salad")
    await answer(0, "fail")
    await waitFor(() => expect(hook.result.current.isError).toBe(true))

    await click("salad")
    await waitFor(() => expect(hook.result.current.isError).toBe(false))
  })

  it("fails straight away when I'm offline, instead of waiting to go back online", async () => {
    onlineManager.setOnline(false)
    // Offline, the browser can't reach the server: the request fails at once.
    put.mockImplementation(() => ({
      json: () => Promise.reject(new TypeError("Failed to fetch")),
    }))
    const { hook, shown, invalidate } = setup(poll([2, 1, 0]))

    act(() => hook.result.current.vote("salad", shown()!))
    expect(shown()).toEqual(poll([2, 1, 1], "salad"))

    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(put).toHaveBeenCalledTimes(1)
    expect(shown()).toEqual(poll([2, 1, 0]))
    expect(shown("lunch")).toEqual(poll([2, 1, 0]))
    expect(invalidate).toHaveBeenCalledTimes(1)
  })
})
