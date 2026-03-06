import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"

export function EmptyState({
  title = "Empty",
  description,
  Icon = Inbox,
}: {
  title?: string
  description?: string
  Icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
      <Icon className="h-6 w-6" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      {description ? <p className="text-xs">{description}</p> : null}
    </div>
  )
}

