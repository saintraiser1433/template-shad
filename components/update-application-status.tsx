"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  APPROVED: ["FUNDED"],
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
}: {
  applicationId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const options = NEXT_STATUS[currentStatus] ?? []

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
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (options.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? "Updating…" : "Update status"}
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
