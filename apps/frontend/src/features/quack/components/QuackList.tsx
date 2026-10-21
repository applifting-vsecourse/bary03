import type { ReactNode } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem, type QuackDeleteAs } from "@/features/quack/components/QuackItem"

// The role that may delete anyone's quack; the server enforces the same rule.
const MODERATOR_ROLE = "admin"

type QuackListProps = {
  quacks: Quack[]
  isLoading?: boolean
  error?: Error
  onReload?: () => void
  /** What an empty list says, e.g. when a search finds nothing. */
  emptyMessage?: string
  /** Offered under the empty message, e.g. a way to write the first quack. */
  emptyAction?: ReactNode
  /** The signed-in user: their quacks get a delete action. */
  viewerId?: string
  /** The signed-in user's role: a moderator gets a delete action on every quack. */
  viewerRole?: string
}

export function QuackList({
  quacks,
  isLoading,
  error,
  onReload,
  emptyMessage = "No quacks yet. Post the first one.",
  emptyAction,
  viewerId,
  viewerRole,
}: QuackListProps) {
  const deleteAsFor = (quack: Quack): QuackDeleteAs | undefined => {
    if (viewerId !== undefined && quack.userId === viewerId) return "author"
    if (viewerRole === MODERATOR_ROLE) return "moderator"
    return undefined
  }

  return (
    <div className="flex flex-col">
      {isLoading && quacks.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : null}

      {error ? (
        <Alert
          variant="destructive"
          className="mb-4"
        >
          <AlertTitle>Couldn&apos;t load quacks</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            {onReload ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
              >
                <RefreshCw className="size-4" />
                Reload
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && quacks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : null}

      {quacks.map((quack) => (
        <QuackItem
          key={quack.id}
          quack={quack}
          deleteAs={deleteAsFor(quack)}
        />
      ))}
    </div>
  )
}
