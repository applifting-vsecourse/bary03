import { useMutation, useQueryClient } from "@tanstack/react-query"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { DeletedQuack, Quack, Reply } from "@/features/quack/api/quackSchemas"

/** What the server keeps of a deleted quack with replies: nothing but its place. */
const placeholderOf = (quack: Quack): DeletedQuack => ({
  id: quack.id,
  deleted: true,
  text: null,
  mood: null,
  userId: null,
  createdAt: quack.createdAt,
  user: null,
  poll: null,
  replyCount: quack.replyCount,
})

/**
 * The quack's reply count one lower, after one of its replies went. A
 * placeholder whose last reply went is gone too: the server deletes it
 * along with the reply.
 */
const withoutOneReply = (quack: Quack): Quack[] => {
  const replyCount = Math.max(quack.replyCount - 1, 0)
  if (quack.deleted && replyCount === 0) return []
  return [{ ...quack, replyCount }]
}

/** Deletes a quack, or a reply when `parentId` (the quack it answers) is set. */
export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ quackId }: { quackId: string; parentId?: string }) => deleteQuack(quackId),
    // Not optimistic, but the dialog waits on it: paused while offline, it
    // would spin forever. Always send, so offline fails at once with a message.
    networkMode: "always",
    onSuccess: async (_data, { quackId, parentId }) => {
      // Show the result in every cached list (All, Mine, any search) straight
      // away, then refetch so the lists match the server.
      if (parentId === undefined) {
        // A quack with replies stays as a placeholder where it was
        // (docs/adr/0001); the refetch takes it out of Mine and searches,
        // where it no longer belongs.
        queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
          quacks?.flatMap((quack) => {
            if (quack.id !== quackId) return [quack]
            return quack.replyCount > 0 ? [placeholderOf(quack)] : []
          }),
        )
      } else {
        queryClient.setQueryData<Reply[]>(quackKeys.replies(parentId), (replies) =>
          replies?.filter((reply) => reply.id !== quackId),
        )
        queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
          quacks?.flatMap((quack) => (quack.id === parentId ? withoutOneReply(quack) : [quack])),
        )
      }
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
