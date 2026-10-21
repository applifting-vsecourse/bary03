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

type QuackDeleteButtonProps = { quackId: string }

/** Deletes a quack after the author confirms. Only render it on the author's own quacks. */
export function QuackDeleteButton({ quackId }: QuackDeleteButtonProps) {
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
          aria-label="Delete quack"
          className="text-muted-foreground"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this quack?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from the feed for everyone, with any poll votes. You can&apos;t undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteQuack.error ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            Couldn&apos;t delete the quack: {deleteQuack.error.message}
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
              deleteQuack.mutate(quackId, { onSuccess: () => setIsOpen(false) })
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
