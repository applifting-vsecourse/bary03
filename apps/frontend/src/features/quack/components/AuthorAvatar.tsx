import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type AuthorAvatarProps = {
  name: string
  className?: string
}

/** The author's initials, up to two: "Caffeinated Duck" is "CD". */
export function AuthorAvatar({ name, className }: AuthorAvatarProps) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Avatar className={className}>
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
