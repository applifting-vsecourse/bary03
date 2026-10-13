import { api, HTTPError } from "@/lib/api-client"

import { settingsSchema, type Settings } from "@/features/settings/api/settingsSchemas"

/** The server said the username belongs to someone else (409). */
export class UsernameTakenError extends Error {}

export async function updateSettings(input: Settings): Promise<Settings> {
  try {
    return settingsSchema.parse(await api.put("settings", { json: input }).json())
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) {
      throw new UsernameTakenError(error.message)
    }
    throw error
  }
}
