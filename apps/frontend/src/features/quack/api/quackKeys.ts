/** "all" is everyone's quacks; "mine" only the signed-in user's. */
export type QuackFilter = "all" | "mine"

export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (search: string, filter: QuackFilter = "all") =>
    [...quackKeys.lists(), { search, filter }] as const,
}
