import { useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { useSession } from "@/features/auth/hooks/useSession"
import { QuackFeed } from "@/features/quack/components/QuackFeed"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { settingsQueryOptions } from "@/features/settings/api/settingsQueryOptions"

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  // Start loading the default mood with the page. prefetchQuery never throws:
  // if settings fail, the form simply starts with no mood.
  loader: ({ context }) => context.queryClient.prefetchQuery(settingsQueryOptions()),
  component: QuacksPage,
})

function QuacksPage() {
  const { data: settings } = useQuery(settingsQueryOptions())
  const { user } = useSession()
  const quackText = useRef<HTMLTextAreaElement>(null)

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          defaultMood={settings?.defaultMood ?? undefined}
          textRef={quackText}
          className="mb-8"
        />

        <QuackFeed
          viewerId={user?.id}
          viewerRole={user?.role}
          onWriteFirst={() => quackText.current?.focus()}
        />
      </section>
    </>
  )
}
