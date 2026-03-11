"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ApplicationStatus } from "@prisma/client"

const NEXT_STATUS: Record<string, ApplicationStatus[]> = {
  PENDING: ["CIBI_REVIEW"],
  CIBI_REVIEW: ["MANAGER_REVIEW", "REJECTED"],
  MANAGER_REVIEW: ["APPROVED", "COMMITTEE_REVIEW", "REJECTED"],
  COMMITTEE_REVIEW: ["BOARD_REVIEW", "REJECTED"],
  BOARD_REVIEW: ["APPROVED", "REJECTED"],
  // Once approved, funding is done via "Create loan" instead of a separate "Mark funded" step.
  APPROVED: [],
  // Keep RELEASED transition if you still want a final state after funding.
  FUNDED: ["RELEASED"],
}

const LABELS: Record<string, string> = {
  CIBI_REVIEW: "Send to CI/BI",
  MANAGER_REVIEW: "To Manager",
  COMMITTEE_REVIEW: "To Committee",
  BOARD_REVIEW: "To Board",
  APPROVED: "Approve",
  REJECTED: "Reject",
  FUNDED: "Mark funded",
  RELEASED: "Mark released",
}

export function UpdateApplicationStatus({
  applicationId,
  currentStatus,
  role,
}: {
  applicationId: string
  currentStatus: string
  role?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  let options = NEXT_STATUS[currentStatus] ?? []

  // Collectors should not see the "Send to CI/BI" action; they already ARE the CI/BI role.
  if (role === "COLLECTOR") {
    options = options.filter((s) => s !== "CIBI_REVIEW")
  }

  async function setStatus(status: ApplicationStatus) {
    setLoading(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error ?? "Failed to update")
        return
      }
      // Let client-side history tables re-fetch immediately (no manual refresh needed).
      window.dispatchEvent(new Event("activity-log-updated"))
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (options.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="action" size="icon-sm" disabled={loading} title="Update status">
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => setStatus(status)}
            className={status === "REJECTED" ? "text-destructive" : ""}
          >
            {LABELS[status] ?? status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
