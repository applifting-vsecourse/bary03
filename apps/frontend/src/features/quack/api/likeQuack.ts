import { api } from "@/lib/api-client"

/**
 * A quack's or a reply's likes as the signed-in user sees them
 * (docs/adr/0002). A placeholder has none: the server sends `likes: null`.
 */
export type QuackLikes = {
  count: number
  likedByMe: boolean
}

/** Likes the quack as me; liking it again changes nothing. */
export async function likeQuack(quackId: string): Promise<void> {
  await api.put(`quacks/${quackId}/like`)
}

/** Takes back my like; taking back a like I never gave changes nothing. */
export async function unlikeQuack(quackId: string): Promise<void> {
  await api.delete(`quacks/${quackId}/like`)
}
