import { HTTPError } from "ky"
import { describe, expect, it, vi } from "vitest"

import { updateSettings, UsernameTakenError } from "@/features/settings/api/updateSettings"

const { put } = vi.hoisted(() => ({ put: vi.fn() }))

vi.mock("@/lib/api-client", async () => ({
  api: { put },
  HTTPError: (await import("ky")).HTTPError,
}))

const settings = { username: "BreadCritic", name: "Bread", bio: null, defaultMood: null }

const failWith = (status: number, message: string) => {
  const request = new Request("http://test/settings", { method: "PUT" })
  const error = new HTTPError(new Response(null, { status }), request, {} as never)
  error.message = message
  put.mockReturnValue({ json: () => Promise.reject(error) })
}

describe("updateSettings", () => {
  it("returns what the server saved", async () => {
    put.mockReturnValue({ json: () => Promise.resolve(settings) })

    await expect(updateSettings(settings)).resolves.toEqual(settings)
    expect(put).toHaveBeenCalledWith("settings", { json: settings })
  })

  it("turns a conflict into a taken username", async () => {
    failWith(409, "That username is already taken")

    const error = await updateSettings(settings).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(UsernameTakenError)
    expect(error).toHaveProperty("message", "That username is already taken")
  })

  it("passes other failures through", async () => {
    failWith(500, "Internal server error")

    const error = await updateSettings(settings).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HTTPError)
    expect(error).not.toBeInstanceOf(UsernameTakenError)
  })
})
