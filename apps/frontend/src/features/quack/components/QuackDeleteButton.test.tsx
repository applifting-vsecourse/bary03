import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackDeleteButton } from "@/features/quack/components/QuackDeleteButton"

const { del } = vi.hoisted(() => ({ del: vi.fn() }))

// The button is under test, not the network: stub the HTTP client.
vi.mock("@/lib/api-client", () => ({ api: { delete: del } }))

const quack = (id: string): Quack => ({
  id,
  text: `quack ${id}`,
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
})

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  // The quack is in the All feed and in Mine.
  queryClient.setQueryData(quackKeys.list(""), [quack("q1"), quack("q2")])
  queryClient.setQueryData(quackKeys.list("", "mine"), [quack("q1")])
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  render(
    <QueryClientProvider client={queryClient}>
      <QuackDeleteButton quackId="q1" />
    </QueryClientProvider>,
  )
  const ids = (filter: "all" | "mine") =>
    queryClient.getQueryData<Quack[]>(quackKeys.list("", filter))?.map((q) => q.id)
  return { ids }
}

describe("QuackDeleteButton", () => {
  beforeEach(() => {
    del.mockReset()
    del.mockResolvedValue(new Response(null, { status: 204 }))
  })

  it("asks before deleting", async () => {
    setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))

    expect(screen.getByRole("alertdialog", { name: "Delete this quack?" })).toBeInTheDocument()
    expect(del).not.toHaveBeenCalled()
  })

  it("deletes nothing when cancelled", async () => {
    const { ids } = setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(del).not.toHaveBeenCalled()
    expect(ids("all")).toEqual(["q1", "q2"])
  })

  it("deletes once confirmed and takes the quack off every feed", async () => {
    const { ids } = setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(del).toHaveBeenCalledWith("quacks/q1")
    expect(ids("all")).toEqual(["q2"])
    expect(ids("mine")).toEqual([])
  })

  it("keeps the dialog open with the reason when deleting fails", async () => {
    del.mockRejectedValue(new Error("You can only delete your own quacks"))
    const { ids } = setup()

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(
      await screen.findByText("Couldn't delete the quack: You can only delete your own quacks"),
    ).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(ids("all")).toEqual(["q1", "q2"])
  })
})
