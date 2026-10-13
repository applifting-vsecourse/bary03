import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Settings } from "@/features/settings/api/settingsSchemas"
import { UsernameTakenError } from "@/features/settings/api/updateSettings"
import { SettingsForm } from "@/features/settings/components/SettingsForm"

type MutateOptions = {
  onSuccess?: (saved: Settings) => void
  onError?: (error: Error) => void
}

const { mutate, toastSuccess } = vi.hoisted(() => ({ mutate: vi.fn(), toastSuccess: vi.fn() }))
const mutation = { mutate, reset: vi.fn(), isPending: false, error: null as Error | null }

// The form is under test, not the network: stub the mutation hook.
vi.mock("@/features/settings/hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => mutation,
}))
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }))

const saved: Settings = {
  username: "BreadCritic",
  name: "The Bread Critic",
  bio: null,
  defaultMood: null,
}

const renderForm = () => render(<SettingsForm settings={saved} />)

const field = (label: string) => screen.getByLabelText(label)

const replaceText = async (label: string, text: string) => {
  await userEvent.clear(field(label))
  if (text) await userEvent.type(field(label), text)
}

const save = () => userEvent.click(screen.getByRole("button", { name: "Save" }))

describe("SettingsForm", () => {
  beforeEach(() => {
    mutate.mockReset()
    toastSuccess.mockReset()
    mutation.error = null
  })

  it("starts with what is saved", () => {
    renderForm()

    expect(field("Username")).toHaveValue("BreadCritic")
    expect(field("Display name")).toHaveValue("The Bread Critic")
    expect(field("Bio")).toHaveValue("")
    expect(screen.getByRole("combobox", { name: "Default mood" })).toHaveTextContent("No mood")
  })

  it("saves every field, trimmed", async () => {
    renderForm()

    await replaceText("Username", " bread.critic_2 ")
    await replaceText("Display name", "Bread Critic ")
    await replaceText("Bio", "Rating every loaf.")
    await userEvent.click(screen.getByRole("combobox", { name: "Default mood" }))
    await userEvent.click(screen.getByRole("option", { name: /silly/i }))
    await save()

    expect(mutate).toHaveBeenCalledWith(
      {
        username: "bread.critic_2",
        name: "Bread Critic",
        bio: "Rating every loaf.",
        defaultMood: "silly",
      },
      expect.anything(),
    )
  })

  it("sends an empty bio and no mood as nothing", async () => {
    renderForm()

    await save()

    expect(mutate).toHaveBeenCalledWith(
      { username: "BreadCritic", name: "The Bread Critic", bio: null, defaultMood: null },
      expect.anything(),
    )
  })

  it("shows the username hint until there is something to fix", () => {
    renderForm()

    expect(field("Username")).toHaveAccessibleDescription(
      "3–30 characters: letters, numbers, dots and underscores.",
    )
  })

  it.each([
    ["", "Username is required."],
    ["ab", "Username is too short — use at least 3 characters."],
    ["a".repeat(34), "Username is too long — use at most 30 characters (you have 34)."],
    ["bread critic", "Spaces aren't allowed. Use a dot or underscore instead."],
    ["bread#critic", `"#" isn't allowed. Use only letters, numbers, dots and underscores.`],
  ])("says what is wrong with the username %j, in place of the hint", async (username, message) => {
    renderForm()

    await replaceText("Username", username)
    await save()

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(field("Username")).toHaveAccessibleDescription(message)
    expect(screen.queryByText(/^3–30 characters/)).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("says what is wrong with the display name and the bio", async () => {
    renderForm()

    await replaceText("Display name", "  ")
    await userEvent.click(field("Bio"))
    await userEvent.paste("a".repeat(172))
    await save()

    expect(await screen.findByText("Display name is required.")).toBeInTheDocument()
    expect(
      screen.getByText("Bio is too long — use at most 160 characters (you have 172)."),
    ).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("says how long a display name is when it is too long", async () => {
    renderForm()

    await userEvent.clear(field("Display name"))
    await userEvent.click(field("Display name"))
    await userEvent.paste("a".repeat(52))
    await save()

    expect(
      await screen.findByText(
        "Display name is too long — use at most 50 characters (you have 52).",
      ),
    ).toBeInTheDocument()
  })

  it("says a taken username next to the field and keeps what was typed", async () => {
    mutate.mockImplementation((_values, options: MutateOptions) => {
      const error = new UsernameTakenError("That username is already taken")
      mutation.error = error
      options.onError?.(error)
    })
    renderForm()

    await replaceText("Username", "DeepDuckThoughts")
    await save()

    expect(await screen.findByText("That username is already taken")).toBeInTheDocument()
    expect(field("Username")).toHaveValue("DeepDuckThoughts")
    expect(field("Username")).toHaveAttribute("aria-invalid", "true")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("confirms a save and makes it the new starting point", async () => {
    mutate.mockImplementation((values: Settings, options: MutateOptions) =>
      options.onSuccess?.(values),
    )
    renderForm()

    await replaceText("Username", "Crumbs")
    await save()

    expect(toastSuccess).toHaveBeenCalledWith("Settings saved")
    expect(field("Username")).toHaveValue("Crumbs")
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled()
  })

  it("discards changes back to what is saved", async () => {
    renderForm()
    const discard = screen.getByRole("button", { name: "Discard changes" })
    expect(discard).toBeDisabled()

    await replaceText("Username", "SomethingElse")
    await replaceText("Display name", "Someone")
    await userEvent.type(field("Bio"), "Hi")
    await userEvent.click(discard)

    expect(field("Username")).toHaveValue("BreadCritic")
    expect(field("Display name")).toHaveValue("The Bread Critic")
    expect(field("Bio")).toHaveValue("")
    expect(mutate).not.toHaveBeenCalled()
  })
})
