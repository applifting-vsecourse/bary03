import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { QuackPoll as QuackPollData } from "@/features/quack/api/quackSchemas"
import { useVote } from "@/features/quack/hooks/useVote"

// Whole numbers, so the shares may not add up to exactly 100%.
const percentOf = (votes: number, total: number) =>
  total === 0 ? 0 : Math.round((votes / total) * 100)

const votesLabel = (votes: number) => (votes === 1 ? "1 vote" : `${votes} votes`)

type QuackPollProps = {
  quackId: string
  poll: QuackPollData
  className?: string
}

/**
 * A poll's answers with their results. Everyone sees the results, voted or
 * not; clicking an answer votes for it or moves my vote to it.
 */
export function QuackPoll({ quackId, poll, className }: QuackPollProps) {
  const { vote, isError } = useVote(quackId)

  const handleVote = (optionId: string) => {
    // My current answer again changes nothing: a vote can't be taken back.
    if (optionId === poll.myOptionId) return
    vote(optionId, poll)
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const percent = percentOf(option.votes, poll.totalVotes)
          const isMine = option.id === poll.myOptionId
          return (
            <li key={option.id}>
              <Button
                type="button"
                variant="outline"
                aria-pressed={isMine}
                onClick={() => handleVote(option.id)}
                className="h-auto w-full flex-col items-stretch gap-1 px-3 py-2 text-left font-normal whitespace-normal"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn("flex items-center gap-2 break-words", isMine && "font-medium")}
                  >
                    {/* Marked by an icon and weight, not colour alone. */}
                    {isMine ? <Check aria-hidden="true" /> : null}
                    {option.text}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {votesLabel(option.votes)} · {percent}%
                  </span>
                </span>
                {/* The numbers above carry the meaning; the bar only shows the share. */}
                <span
                  className="block h-2 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-muted-foreground"
                    style={{ width: `${percent}%` }}
                  />
                </span>
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {poll.totalVotes === 0 ? "No votes yet" : votesLabel(poll.totalVotes)}
      </p>
      {isError ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          Your vote wasn&apos;t saved. Try again.
        </p>
      ) : null}
    </div>
  )
}
