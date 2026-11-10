import { formatDate } from "@/lib/date"

import type { Reply } from "@/features/quack/api/quackSchemas"
import { AuthorAvatar } from "@/features/quack/components/AuthorAvatar"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackReplyItemProps = {
  reply: Reply
}

/** Laid out like a quack, smaller: no mood, no poll, no replies of its own. */
export function QuackReplyItem({ reply }: QuackReplyItemProps) {
  const { name, username } = reply.user

  return (
    <li className="flex gap-3">
      <AuthorAvatar
        name={name}
        className="size-8"
      />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName name={name} /> <UsersUserName username={username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time
            dateTime={reply.createdAt.toISOString()}
            className="text-xs text-muted-foreground"
          >
            {formatDate(reply.createdAt)}
          </time>
        </div>
        <p className="text-sm break-words whitespace-pre-line">{reply.text}</p>
      </div>
    </li>
  )
}
