import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

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

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          defaultMood={settings?.defaultMood ?? undefined}
          className="mb-8"
        />

        <QuackFeed />
      </section>
    </>
  )
}
