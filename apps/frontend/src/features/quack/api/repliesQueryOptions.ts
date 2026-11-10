import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { repliesSchema } from "@/features/quack/api/quackSchemas"

/** A quack's replies, oldest first; the server sets the order. */
export const repliesQueryOptions = (quackId: string) =>
  queryOptions({
    queryKey: quackKeys.replies(quackId),
    queryFn: async () => repliesSchema.parse(await api.get(`quacks/${quackId}/replies`).json()),
  })
