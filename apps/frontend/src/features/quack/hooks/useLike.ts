import type { QuackLikes } from "@/features/quack/api/likeQuack"

/** The likes with mine set to `isLiked`: what the server will say, shown before it does. Not implemented yet. */
export function withMyLike(likes: QuackLikes, isLiked: boolean): QuackLikes {
  void likes
  void isLiked
  throw new Error("not implemented")
}

/**
 * Likes or unlikes one quack or reply, optimistically (networkMode "always",
 * like useVote). `parentId` is set for a reply: its likes live in that quack's
 * replies, not in the feed. Not implemented yet.
 */
export function useLike(
  _quackId: string,
  _parentId?: string,
): {
  /** Sets my like to `isLiked`; `likes` is what is on screen now. */
  setLiked: (isLiked: boolean, likes: QuackLikes) => void
  /** A request is in flight: the button is disabled until it settles. */
  isPending: boolean
  /** My last like or unlike wasn't saved and the screen was rolled back. */
  isError: boolean
} {
  throw new Error("not implemented")
}
