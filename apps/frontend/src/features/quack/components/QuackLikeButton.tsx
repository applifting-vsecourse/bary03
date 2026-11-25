import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { QuackLikes } from "@/features/quack/api/likeQuack"
import { useLike } from "@/features/quack/hooks/useLike"

type QuackLikeButtonProps = {
  quackId: string
  likes: QuackLikes
  /** Set for a reply: the quack it answers. */
  parentId?: string
}

// "0 likes", "1 like", "2 likes"
const likeCount = (count: number): string => `${count} ${count === 1 ? "like" : "likes"}`

/** The like toggle and its count. Not rendered on a placeholder: it keeps no likes. */
export function QuackLikeButton({ quackId, likes, parentId }: QuackLikeButtonProps) {
  const { setLiked, isPending, isError } = useLike(quackId, parentId)
  const countText = likeCount(likes.count)

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Like, ${countText}`}
        aria-pressed={likes.likedByMe}
        // a second click mustn't race the request still on its way (R21)
        disabled={isPending}
        onClick={() => setLiked(!likes.likedByMe, likes)}
        className="-ml-2 text-muted-foreground"
      >
        <Heart className={cn(likes.likedByMe && "fill-current text-primary")} />
        {countText}
      </Button>
      {isError ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          Your like wasn&apos;t saved. Try again.
        </p>
      ) : null}
    </div>
  )
}
