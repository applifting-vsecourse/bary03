/**
 * A quack's or a reply's likes as the signed-in user sees them
 * (docs/adr/0002). A placeholder has none: the server sends `likes: null`.
 */
export type QuackLikes = {
  count: number
  likedByMe: boolean
}

/** Likes the quack as me; liking it again changes nothing. Not implemented yet. */
export function likeQuack(_quackId: string): Promise<void> {
  throw new Error("not implemented")
}

/** Takes back my like; taking back a like I never gave changes nothing. Not implemented yet. */
export function unlikeQuack(_quackId: string): Promise<void> {
  throw new Error("not implemented")
}
