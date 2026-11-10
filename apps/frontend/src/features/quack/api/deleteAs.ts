// The role that may delete anyone's quack or reply; the server enforces the same rule.
const MODERATOR_ROLE = "admin"

/** Why the signed-in user may delete something: they wrote it, or they moderate. */
export type QuackDeleteAs = "author" | "moderator"

/** The signed-in user, as far as deleting goes. */
export type Viewer = { id?: string; role?: string }

/** Why `viewer` may delete what `authorId` wrote, or undefined when they may not. */
export const deleteAsFor = (authorId: string, viewer: Viewer): QuackDeleteAs | undefined => {
  if (viewer.id !== undefined && authorId === viewer.id) return "author"
  if (viewer.role === MODERATOR_ROLE) return "moderator"
  return undefined
}
