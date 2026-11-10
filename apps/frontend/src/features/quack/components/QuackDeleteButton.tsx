import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type QuackDeleteButtonProps = {
  /** The quack or reply to delete. */
  quackId: string
  /** Set for a reply: the quack it answers. */
  parentId?: string
  /** A quack with replies is kept as "This quack was deleted"; the dialog says so. */
  replyCount?: number
  /** Set when a moderator deletes someone else's quack: whose it is. */
  moderatedAuthorName?: string
}

// "Deep Duck Thoughts' quack", "Caffeinated Duck's quack"
const possessive = (name: string): string => (name.endsWith("s") ? `${name}'` : `${name}'s`)

// 'Its 2 replies will stay, under "This quack was deleted".'
const repliesStay = (count: number): string =>
  `${count === 1 ? "Its reply" : `Its ${count} replies`} will stay, under "This quack was deleted".`

/**
 * Deletes a quack after confirmation. Render it only where the signed-in user
 * may delete: their own quacks, or any quack for a moderator.
 */
export function QuackDeleteButton({
  quackId,
  parentId,
  replyCount = 0,
  moderatedAuthorName,
}: QuackDeleteButtonProps) {
  const what = parentId === undefined ? "quack" : "reply"
  const [isOpen, setIsOpen] = useState(false)
  const deleteQuack = useDeleteQuack()

  const handleOpenChange = (shouldOpen: boolean) => {
    // Closing mid-request would hide whether it worked.
    if (deleteQuack.isPending) return
    if (shouldOpen) deleteQuack.reset()
    setIsOpen(shouldOpen)
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${what}`}
          className="text-muted-foreground"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {moderatedAuthorName
              ? `Delete ${possessive(moderatedAuthorName)} ${what}?`
              : `Delete this ${what}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {moderatedAuthorName ? "You're deleting it as a moderator. " : null}
            {parentId !== undefined
              ? "It disappears for everyone. "
              : replyCount > 0
                ? `${repliesStay(replyCount)} Everything else about it is erased, including who wrote it. `
                : "It disappears from the feed for everyone, with any poll votes. "}
            You can&apos;t undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteQuack.error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            Couldn&apos;t delete the {what}: {deleteQuack.error.message}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteQuack.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteQuack.isPending}
            onClick={(event) => {
              // Stay open until the server answers: on success the quack (and
              // this dialog with it) leaves the feed; on failure the error shows.
              event.preventDefault()
              deleteQuack.mutate({ quackId, parentId }, { onSuccess: () => setIsOpen(false) })
            }}
          >
            {deleteQuack.isPending ? <Loader2 className="animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
