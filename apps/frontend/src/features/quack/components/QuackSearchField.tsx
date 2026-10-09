import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type QuackSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function QuackSearchField({ value, onChange, className }: QuackSearchFieldProps) {
  return (
    <div
      role="search"
      className={cn("flex flex-col gap-2", className)}
    >
      <Label htmlFor="quack-search">Search quacks</Label>
      <Input
        id="quack-search"
        type="search"
        placeholder="sourdough, Deep Duck or @BreadCritic"
        maxLength={100}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
