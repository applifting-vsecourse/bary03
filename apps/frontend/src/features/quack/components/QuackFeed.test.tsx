import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackFeed } from "@/features/quack/components/QuackFeed"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

// The feed is under test, not the network: stub the HTTP client.
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const quack = (id: string, text: string) => ({
  id,
  text,
  mood: null,
  userId: "u1",
  createdAt: "2026-01-01T12:00:00Z",
  user: { id: "u1", name: "The Bread Critic", username: "BreadCritic" },
})

const respondWith = (body: unknown) => ({ json: () => Promise.resolve(body) })

const searchParamsOfCalls = () =>
  get.mock.calls.map(([, options]) => (options as { searchParams?: unknown }).searchParams)

const renderFeed = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <QuackFeed />
    </QueryClientProvider>,
  )

describe("QuackFeed", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation((_path: string, options?: { searchParams?: { q: string } }) =>
      respondWith(
        options?.searchParams
          ? [quack("q1", "Sourdough. Thrown by a child.")]
          : [quack("q1", "Sourdough. Thrown by a child."), quack("q2", "Multigrain. 9/10.")],
      ),
    )
  })

  it("shows the full feed with an empty search field", async () => {
    renderFeed()

    expect(screen.getByLabelText("Search quacks")).toHaveValue("")
    expect(await screen.findByText("Multigrain. 9/10.")).toBeInTheDocument()
    expect(searchParamsOfCalls()).toEqual([undefined])
  })

  it("searches once typing stops, not for every letter", async () => {
    renderFeed()
    await screen.findByText("Multigrain. 9/10.")

    await userEvent.type(screen.getByLabelText("Search quacks"), "sourdough")

    await waitFor(() => expect(screen.queryByText("Multigrain. 9/10.")).not.toBeInTheDocument())
    expect(screen.getByText("Sourdough. Thrown by a child.")).toBeInTheDocument()
    expect(searchParamsOfCalls()).toEqual([undefined, { q: "sourdough" }])
  })

  it("sends the phrase without surrounding spaces and ignores a blank one", async () => {
    renderFeed()
    await screen.findByText("Multigrain. 9/10.")

    const field = screen.getByLabelText("Search quacks")
    await userEvent.type(field, "   ")
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(searchParamsOfCalls()).toEqual([undefined])

    await userEvent.type(field, "Deep Duck  ")
    await waitFor(() => expect(searchParamsOfCalls()).toEqual([undefined, { q: "Deep Duck" }]))
  })

  it("brings back the full feed when the field is cleared", async () => {
    renderFeed()
    const field = screen.getByLabelText("Search quacks")
    await userEvent.type(field, "sourdough")
    await waitFor(() => expect(screen.queryByText("Multigrain. 9/10.")).not.toBeInTheDocument())

    await userEvent.clear(field)

    expect(await screen.findByText("Multigrain. 9/10.")).toBeInTheDocument()
  })

  it("says when nothing matches and keeps the typed text", async () => {
    get.mockImplementation((_path: string, options?: { searchParams?: unknown }) =>
      respondWith(options?.searchParams ? [] : [quack("q1", "Sourdough. Thrown by a child.")]),
    )
    renderFeed()
    await screen.findByText("Sourdough. Thrown by a child.")

    await userEvent.type(screen.getByLabelText("Search quacks"), "child thrown")

    expect(await screen.findByText("No posts match your search.")).toBeInTheDocument()
    expect(screen.getByLabelText("Search quacks")).toHaveValue("child thrown")
  })

  it("shows a failed search with a retry and keeps the typed text", async () => {
    renderFeed()
    await screen.findByText("Multigrain. 9/10.")
    get.mockImplementation(() => ({ json: () => Promise.reject(new Error("Server unreachable")) }))

    await userEvent.type(screen.getByLabelText("Search quacks"), "sourdough")

    expect(await screen.findByText("Server unreachable")).toBeInTheDocument()
    expect(screen.getByLabelText("Search quacks")).toHaveValue("sourdough")

    get.mockImplementation(() => respondWith([quack("q1", "Sourdough. Thrown by a child.")]))
    await userEvent.click(screen.getByRole("button", { name: /reload/i }))

    expect(await screen.findByText("Sourdough. Thrown by a child.")).toBeInTheDocument()
    expect(screen.queryByText("Server unreachable")).not.toBeInTheDocument()
  })
})
