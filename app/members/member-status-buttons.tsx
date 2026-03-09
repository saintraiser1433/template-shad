"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { toast } from "sonner"

type Status = "ACTIVE" | "INACTIVE"

export function MemberStatusButtons({
  memberId,
  status,
}: {
  memberId: string
  status: Status
}) {
  const router = useRouter()

  async function setStatus(newStatus: Status) {
    const res = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? "Failed to update status")
      return
    }
    toast.success(`Member set to ${newStatus.toLowerCase()}`)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={status === "ACTIVE" ? "default" : "secondary"} className="shrink-0">
        {status}
      </Badge>
      <div className="flex gap-0.5">
        <Button
          variant="action"
          size="icon-sm"
          title="Set Active"
          onClick={() => setStatus("ACTIVE")}
          disabled={status === "ACTIVE"}
        >
          <Check className="size-4" />
        </Button>
        <Button
          variant="action"
          size="icon-sm"
          title="Set Inactive"
          onClick={() => setStatus("INACTIVE")}
          disabled={status === "INACTIVE"}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
