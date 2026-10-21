import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackDeleteButton } from "@/features/quack/components/QuackDeleteButton"
import { QuackMoodLabel } from "@/features/quack/components/QuackMoodLabel"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

/** Why the signed-in user may delete this quack: they wrote it, or they moderate. */
export type QuackDeleteAs = "author" | "moderator"

type QuackItemProps = {
  quack: Quack
  /** Shows the delete action; leave out when the signed-in user may not delete it. */
  deleteAs?: QuackDeleteAs
}

export function QuackItem({ quack, deleteAs }: QuackItemProps) {
  const { name, username } = quack.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

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
      </div>
    </article>
  )
}
