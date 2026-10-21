import { api } from "@/lib/api-client"

/** Deletes one of my quacks. The server refuses anyone else's. */
export async function deleteQuack(quackId: string): Promise<void> {
  await api.delete(`quacks/${quackId}`)
}
