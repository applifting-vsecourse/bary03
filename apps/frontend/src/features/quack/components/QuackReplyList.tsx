import { useQuery } from "@tanstack/react-query"
import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { deleteAsFor, type Viewer } from "@/features/quack/api/deleteAs"
import { repliesQueryOptions } from "@/features/quack/api/repliesQueryOptions"
import { QuackReplyItem } from "@/features/quack/components/QuackReplyItem"

type QuackReplyListProps = {
  quackId: string
  /** The signed-in user: their replies get a delete action, every reply for a moderator. */
  viewer?: Viewer
}

/** A quack's replies, oldest first, loaded when the replies are opened. */
export function QuackReplyList({ quackId, viewer = {} }: QuackReplyListProps) {
  const replies = useQuery(repliesQueryOptions(quackId))

  if (replies.isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading replies…
      </div>
    )
  }

  if (replies.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load replies</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{replies.error.message}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void replies.refetch()}
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (replies.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No replies yet. Be the first to reply.</p>
  }

  return (
    <ul
      aria-label="Replies"
      className="flex flex-col gap-4"
    >
      {replies.data.map((reply) => (
        <QuackReplyItem
          key={reply.id}
          reply={reply}
          deleteAs={deleteAsFor(reply.userId, viewer)}
        />
      ))}
    </ul>
  )
}
