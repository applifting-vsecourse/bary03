import type { QuackLikes } from "@/features/quack/api/likeQuack"

type QuackLikeButtonProps = {
  quackId: string
  likes: QuackLikes
  /** Set for a reply: the quack it answers. */
  parentId?: string
}

/** The like toggle and its count. Not implemented yet. */
export function QuackLikeButton(_props: QuackLikeButtonProps): React.ReactNode {
  throw new Error("not implemented")
}
