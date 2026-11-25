import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { likeQuack, unlikeQuack, type QuackLikes } from "@/features/quack/api/likeQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack, Reply } from "@/features/quack/api/quackSchemas"

/** The likes with mine set to `isLiked`: what the server will say, shown before it does. */
export function withMyLike(likes: QuackLikes, isLiked: boolean): QuackLikes {
  if (likes.likedByMe === isLiked) return likes
  return { count: likes.count + (isLiked ? 1 : -1), likedByMe: isLiked }
}

/**
 * Puts `likes` on this quack wherever it is cached: a quack in every feed list
 * (the plain feed and any search), a reply in its quack's replies.
 */
const showLikes = (
  queryClient: QueryClient,
  quackId: string,
  parentId: string | undefined,
  likes: QuackLikes,
) => {
  if (parentId === undefined) {
    queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
      // a placeholder keeps no likes
      quacks?.map((quack) =>
        quack.id === quackId && !quack.deleted ? { ...quack, likes } : quack,
      ),
    )
  } else {
    queryClient.setQueryData<Reply[]>(quackKeys.replies(parentId), (replies) =>
      replies?.map((reply) => (reply.id === quackId ? { ...reply, likes } : reply)),
    )
  }
}

type LikeInput = { isLiked: boolean; likes: QuackLikes }

/**
 * Likes or unlikes one quack or reply, optimistically (networkMode "always",
 * like useVote). `parentId` is set for a reply: its likes live in that quack's
 * replies, not in the feed.
 */
export function useLike(
  quackId: string,
  parentId?: string,
): {
  /** Sets my like to `isLiked`; `likes` is what is on screen now. */
  setLiked: (isLiked: boolean, likes: QuackLikes) => void
  /** A request is in flight: the button is disabled until it settles. */
  isPending: boolean
  /** My last like or unlike wasn't saved and the screen was rolled back. */
  isError: boolean
} {
  const queryClient = useQueryClient()
  const queryKey = parentId === undefined ? quackKeys.lists() : quackKeys.replies(parentId)

  const mutation = useMutation({
    mutationFn: ({ isLiked }: LikeInput) => (isLiked ? likeQuack(quackId) : unlikeQuack(quackId)),
    // By default TanStack pauses a mutation while the browser is offline. The
    // like is already on screen, so a paused one would look saved when it
    // isn't. Always send: offline, it fails at once and rolls back (R20).
    networkMode: "always",
    onMutate: ({ isLiked, likes }) => {
      // A refetch already on its way could land after this click and undo it.
      void queryClient.cancelQueries({ queryKey })
      showLikes(queryClient, quackId, parentId, withMyLike(likes, isLiked))
    },
    onError: (_error, { likes }) => {
      showLikes(queryClient, quackId, parentId, likes)
    },
    // Brings in other people's likes, and the server's word on mine.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const setLiked = (isLiked: boolean, likes: QuackLikes) => mutation.mutate({ isLiked, likes })

  return { setLiked, isPending: mutation.isPending, isError: mutation.isError }
}
