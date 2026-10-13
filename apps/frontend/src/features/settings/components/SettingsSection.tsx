import { useQuery } from "@tanstack/react-query"
import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { settingsQueryOptions } from "@/features/settings/api/settingsQueryOptions"
import { SettingsForm } from "@/features/settings/components/SettingsForm"

export function SettingsSection() {
  const settingsQuery = useQuery(settingsQueryOptions())

  if (settingsQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2
          className="size-5 animate-spin"
          aria-label="Loading settings"
        />
      </div>
    )
  }

  if (settingsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load your settings</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{settingsQuery.error.message}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void settingsQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return <SettingsForm settings={settingsQuery.data} />
}
