import type { ReactNode } from "react"
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { QuackLikes } from "@/features/quack/api/likeQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import { useLike, withMyLike } from "@/features/quack/hooks/useLike"

const { put, del } = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }))

// The hook is under test, not the network: stub the HTTP client.
vi.mock("@/lib/api-client", () => ({ api: { put, delete: del } }))

const likes = (count: number, isLikedByMe = false): QuackLikes => ({
  count,
  likedByMe: isLikedByMe,
})

// Built without the zod types: they don't carry `likes` until the feature does.
const quackWith = (id: string, quackLikes: QuackLikes) => ({
  id,
  deleted: false,
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  replyCount: 1,
  likes: quackLikes,
})

const replyWith = (id: string, parentId: string, replyLikes: QuackLikes) => ({
  id,
  text: "a reply",
  parentId,
  userId: "u2",
  createdAt: new Date("2026-01-01T12:05:00Z"),
  user: { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
  likes: replyLikes,
})

type WithLikes = { id: string; likes: QuackLikes }

// Each request stays open until the test answers it.
let requests: { method: "put" | "delete"; path: string; succeed: () => void; fail: () => void }[] =
  []

let quackCounter = 0

const setup = (start: QuackLikes, { replyStart = likes(0) } = {}) => {
  const quackId = `q${++quackCounter}`
  const replyId = `r${quackCounter}`
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  // The quack shows in the plain feed and in a search at the same time, and
  // its reply in its open replies.
  queryClient.setQueryData(quackKeys.list(""), [quackWith(quackId, start)])
  queryClient.setQueryData(quackKeys.list("lunch"), [quackWith(quackId, start)])
  queryClient.setQueryData(quackKeys.replies(quackId), [replyWith(replyId, quackId, replyStart)])
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const shownInFeed = (search = "") =>
    queryClient.getQueryData<WithLikes[]>(quackKeys.list(search))?.[0]?.likes
  const shownReply = () =>
    queryClient.getQueryData<WithLikes[]>(quackKeys.replies(quackId))?.[0]?.likes

  return { queryClient, wrapper, quackId, replyId, shownInFeed, shownReply }
}

const answer = async (index: number, outcome: "ok" | "fail") => {
  const request = requests.at(index)
  if (!request) throw new Error(`No request #${index} was sent`)
  await act(async () => {
    if (outcome === "fail") request.fail()
    else request.succeed()
    await Promise.resolve()
  })
}

describe("withMyLike", () => {
  it("adds my like: 0 → 1 (R1)", () => {
    expect(withMyLike(likes(0), true)).toEqual(likes(1, true))
  })

  it("changes nothing when I like a quack I already liked (R2)", () => {
    expect(withMyLike(likes(1, true), true)).toEqual(likes(1, true))
  })

  it("takes my like back: 1 → 0 (R3)", () => {
    expect(withMyLike(likes(1, true), false)).toEqual(likes(0, false))
  })

  it("changes nothing when I take back a like I never gave (R4)", () => {
    expect(withMyLike(likes(0), false)).toEqual(likes(0, false))
  })

  it("adds my like to someone else's: 1 → 2 (R5)", () => {
    expect(withMyLike(likes(1), true)).toEqual(likes(2, true))
  })

  it("takes back only mine when someone else liked it too: 2 → 1 (R6)", () => {
    expect(withMyLike(likes(2, true), false)).toEqual(likes(1, false))
  })
})

describe("useLike", () => {
  afterEach(() => {
    onlineManager.setOnline(true)
  })

  beforeEach(() => {
    requests = []
    for (const [method, mockFn] of [
      ["put", put],
      ["delete", del],
    ] as const) {
      mockFn.mockReset()
      mockFn.mockImplementation((path: string) => {
        const response = new Promise<void>((resolve, reject) => {
          requests.push({
            method,
            path,
            succeed: resolve,
            fail: () => reject(new Error("offline")),
          })
        })
        return Object.assign(response, { json: () => response })
      })
    }
  })

  it("shows my like at once, in every feed list, before the server answers (R18)", () => {
    const { wrapper, quackId, shownInFeed } = setup(likes(0))
    const { result } = renderHook(() => useLike(quackId), { wrapper })

    act(() => result.current.setLiked(true, likes(0)))

    expect(shownInFeed()).toEqual(likes(1, true))
    expect(shownInFeed("lunch")).toEqual(likes(1, true))
  })

  it("sends the like, and an unlike, for this quack", async () => {
    const { wrapper, quackId } = setup(likes(0))
    const { result } = renderHook(() => useLike(quackId), { wrapper })

    act(() => result.current.setLiked(true, likes(0)))
    await waitFor(() => expect(requests).toHaveLength(1))
    await answer(0, "ok")
    act(() => result.current.setLiked(false, likes(1, true)))
    await waitFor(() => expect(requests).toHaveLength(2))

    expect(requests.map(({ method, path }) => [method, path])).toEqual([
      ["put", `quacks/${quackId}/like`],
      ["delete", `quacks/${quackId}/like`],
    ])
  })

  it("shows my unlike at once: 1 → 0 (R3)", () => {
    const { wrapper, quackId, shownInFeed } = setup(likes(1, true))
    const { result } = renderHook(() => useLike(quackId), { wrapper })

    act(() => result.current.setLiked(false, likes(1, true)))

    expect(shownInFeed()).toEqual(likes(0, false))
  })

  it("likes a reply in its quack's replies and leaves the quack's own count alone (R9)", () => {
    const { wrapper, quackId, replyId, shownInFeed, shownReply } = setup(likes(0))
    const { result } = renderHook(() => useLike(replyId, quackId), { wrapper })

    act(() => result.current.setLiked(true, likes(0)))

    expect(shownReply()).toEqual(likes(1, true))
    expect(shownInFeed()).toEqual(likes(0))
  })

  it("goes back to how it was and says so when the server rejects my like (R19)", async () => {
    const { wrapper, quackId, shownInFeed } = setup(likes(0))
    const { result } = renderHook(() => useLike(quackId), { wrapper })

    act(() => result.current.setLiked(true, likes(0)))
    await waitFor(() => expect(requests).toHaveLength(1))
    await answer(0, "fail")

    expect(shownInFeed()).toEqual(likes(0))
    expect(shownInFeed("lunch")).toEqual(likes(0))
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it("sends the like even while offline, so it fails at once and rolls back (R20)", async () => {
    onlineManager.setOnline(false)
    const { wrapper, quackId, shownInFeed } = setup(likes(0))
    const { result } = renderHook(() => useLike(quackId), { wrapper })

    act(() => result.current.setLiked(true, likes(0)))
    // not paused until the browser is back online: the request goes out now
    await waitFor(() => expect(requests).toHaveLength(1))
    await answer(0, "fail")

    expect(shownInFeed()).toEqual(likes(0))
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it("is pending while the request is in flight, with the count already changed (R21)", async () => {
    const { wrapper, quackId, shownInFeed } = setup(likes(0))
    const { result } = renderHook(() => useLike(quackId), { wrapper })

    act(() => result.current.setLiked(true, likes(0)))
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(shownInFeed()).toEqual(likes(1, true))

    await answer(0, "ok")
    await waitFor(() => expect(result.current.isPending).toBe(false))
  })
})
