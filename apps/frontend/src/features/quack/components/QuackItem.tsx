import { formatDate } from "@/lib/date"

import type { QuackDeleteAs, Viewer } from "@/features/quack/api/deleteAs"
import type { DeletedQuack, Quack } from "@/features/quack/api/quackSchemas"
import { AuthorAvatar } from "@/features/quack/components/AuthorAvatar"
import { QuackDeleteButton } from "@/features/quack/components/QuackDeleteButton"
import { QuackMoodLabel } from "@/features/quack/components/QuackMoodLabel"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { QuackReplies } from "@/features/quack/components/QuackReplies"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackItemProps = {
  quack: Quack
  /** Shows the delete action; leave out when the signed-in user may not delete it. */
  deleteAs?: QuackDeleteAs
  /** Shows the replies control and reply box; leave out for a static preview. */
  canReply?: boolean
  /** The signed-in user: decides which replies get a delete action. */
  viewer?: Viewer
}

export function QuackItem({ quack, deleteAs, canReply, viewer = {} }: QuackItemProps) {
  if (quack.deleted) {
    return (
      <DeletedQuackItem
        quack={quack}
        canReply={canReply}
        viewer={viewer}
      />
    )
  }

  const { name, username } = quack.user

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <AuthorAvatar
        name={name}
        className="size-12"
      />

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName name={name} /> <UsersUserName username={username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
          {quack.mood ? (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                <QuackMoodLabel mood={quack.mood} />
              </span>
            </>
          ) : null}
          {deleteAs ? (
            <span className="ml-auto self-center">
              <QuackDeleteButton
                quackId={quack.id}
                replyCount={quack.replyCount}
                moderatedAuthorName={deleteAs === "moderator" ? name : undefined}
              />
            </span>
          ) : null}
        </div>
        <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
        {quack.poll ? (
          <QuackPoll
            quackId={quack.id}
            poll={quack.poll}
            className="mt-2"
          />
        ) : null}
        {canReply ? (
          <QuackReplies
            quackId={quack.id}
            replyCount={quack.replyCount}
            viewer={viewer}
          />
        ) : null}
      </div>
    </article>
  )
}

/**
 * A deleted quack kept for its replies (docs/adr/0001). The server erased its
 * text, mood, poll and author, so there is nothing to show but the fact, and
 * nobody can delete it: it goes when its last reply does. It takes no new
 * replies, so its replies open without a reply box.
 */
function DeletedQuackItem({
  quack,
  canReply,
  viewer,
}: {
  quack: DeletedQuack
  canReply?: boolean
  viewer: Viewer
}) {
  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      {/* keeps the replies in line with those under other quacks */}
      <div
        aria-hidden
        className="size-12 shrink-0"
      />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm text-muted-foreground italic">This quack was deleted</p>
        {canReply ? (
          <QuackReplies
            quackId={quack.id}
            replyCount={quack.replyCount}
            viewer={viewer}
            isDeleted
          />
        ) : null}
      </div>
    </article>
  )
}
