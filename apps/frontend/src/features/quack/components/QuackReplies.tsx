import { useId, useState } from "react"
import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { Viewer } from "@/features/quack/api/deleteAs"
import { QuackReplyForm } from "@/features/quack/components/QuackReplyForm"
import { QuackReplyList } from "@/features/quack/components/QuackReplyList"

/** "Reply" while there are none, then "1 reply", "2 replies"… */
export const replyCountLabel = (count: number): string => {
  if (count === 0) return "Reply"
  return count === 1 ? "1 reply" : `${count} replies`
}

type QuackRepliesProps = {
  quackId: string
  replyCount: number
  /** The quack was deleted: its replies stay readable, but it takes no new ones. */
  isDeleted?: boolean
  /** The signed-in user: decides which replies get a delete action. */
  viewer?: Viewer
}

/** The replies control under a quack; opening it shows the replies and the reply box. */
export function QuackReplies({ quackId, replyCount, isDeleted, viewer = {} }: QuackRepliesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="mt-2 flex flex-col gap-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageCircle />
        {replyCountLabel(replyCount)}
      </Button>
      {isOpen ? (
        <div
          id={panelId}
          className="flex flex-col gap-4 border-l border-border pl-4"
        >
          <QuackReplyList
            quackId={quackId}
            viewer={viewer}
          />
          {isDeleted ? null : <QuackReplyForm quackId={quackId} />}
        </div>
      ) : null}
    </div>
  )
}
