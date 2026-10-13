import { cn } from "@/lib/utils"

import type { QuackPoll as QuackPollData } from "@/features/quack/api/quackSchemas"

// Whole numbers, so the shares may not add up to exactly 100%.
const percentOf = (votes: number, total: number) =>
  total === 0 ? 0 : Math.round((votes / total) * 100)

const votesLabel = (votes: number) => (votes === 1 ? "1 vote" : `${votes} votes`)

type QuackPollProps = {
  poll: QuackPollData
  className?: string
}

/** A poll's answers with their results. Everyone sees them, voted or not. */
export function QuackPoll({ poll, className }: QuackPollProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-col gap-3">
        {poll.options.map((option) => {
          const percent = percentOf(option.votes, poll.totalVotes)
          return (
            <li
              key={option.id}
              className="flex flex-col gap-1"
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="break-words">{option.text}</span>
                <span className="shrink-0 text-muted-foreground">
                  {votesLabel(option.votes)} · {percent}%
                </span>
              </div>
              {/* The numbers above carry the meaning; the bar only shows the share. */}
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-muted-foreground"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {poll.totalVotes === 0 ? "No votes yet" : votesLabel(poll.totalVotes)}
      </p>
    </div>
  )
}
