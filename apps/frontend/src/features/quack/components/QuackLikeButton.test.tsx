import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { QuackLikes } from "@/features/quack/api/likeQuack"
import { QuackLikeButton } from "@/features/quack/components/QuackLikeButton"

const { setLiked } = vi.hoisted(() => ({ setLiked: vi.fn() }))
const liking = { setLiked, isPending: false, isError: false }

// The button is under test, not the network: stub the liking hook.
vi.mock("@/features/quack/hooks/useLike", () => ({ useLike: () => liking }))

const likes = (count: number, isLikedByMe = false): QuackLikes => ({
  count,
  likedByMe: isLikedByMe,
})

const renderButton = (quackLikes: QuackLikes) =>
  render(
    <QuackLikeButton
      quackId="q1"
      likes={quackLikes}
    />,
  )

const likeButton = () => screen.getByRole("button", { name: /^Like,/ })

describe("QuackLikeButton", () => {
  beforeEach(() => {
    setLiked.mockReset()
    liking.isPending = false
    liking.isError = false
  })

  it("shows 0 rather than hiding the count (R13)", () => {
    renderButton(likes(0))

    expect(likeButton()).toHaveTextContent("0 likes")
  })

  it("is pressed when I liked it (R14)", () => {
    renderButton(likes(3, true))

    expect(likeButton()).toHaveAttribute("aria-pressed", "true")
  })

  it("is not pressed when I haven't liked it (R14)", () => {
    renderButton(likes(3))

    expect(likeButton()).toHaveAttribute("aria-pressed", "false")
  })

  it('is announced as "Like, 3 likes" (R15)', () => {
    renderButton(likes(3))

    expect(screen.getByRole("button", { name: "Like, 3 likes" })).toBeInTheDocument()
  })

  it.each([
    [0, "0 likes"],
    [1, "1 like"],
    [2, "2 likes"],
  ])("says %i as %s (R16)", (count, text) => {
    renderButton(likes(count))

    expect(likeButton()).toHaveTextContent(text)
    expect(screen.getByRole("button", { name: `Like, ${text}` })).toBeInTheDocument()
  })

  it("likes on click when I haven't liked it (R1, R18)", async () => {
    renderButton(likes(0))

    await userEvent.click(likeButton())

    expect(setLiked).toHaveBeenCalledWith(true, likes(0))
  })

  it("takes my like back on click when I liked it (R3)", async () => {
    renderButton(likes(1, true))

    await userEvent.click(likeButton())

    expect(setLiked).toHaveBeenCalledWith(false, likes(1, true))
  })

  it("is disabled while my like is on its way, so a second click can't race it (R21)", async () => {
    liking.isPending = true
    renderButton(likes(1, true))

    expect(likeButton()).toBeDisabled()
    await userEvent.click(likeButton())
    expect(setLiked).not.toHaveBeenCalled()
  })

  it("says so when my like wasn't saved (R19, R20)", () => {
    liking.isError = true
    renderButton(likes(0))

    expect(screen.getByRole("alert")).toHaveTextContent(/like/i)
  })
})
