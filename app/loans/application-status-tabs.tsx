"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS: { value: string | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CIBI_REVIEW", label: "CIBI Review" },
  { value: "MANAGER_REVIEW", label: "Manager Review" },
  { value: "COMMITTEE_REVIEW", label: "Committee Review" },
  { value: "BOARD_REVIEW", label: "Board Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "FUNDED", label: "Funded" },
  { value: "RELEASED", label: "Released" },
]

export function ApplicationStatusTabs({ current }: { current: string | null }) {
  const searchParams = useSearchParams()

  function buildUrl(appStatus: string | null): string {
    const params = new URLSearchParams(searchParams.toString())
    if (appStatus) params.set("appStatus", appStatus)
    else params.delete("appStatus")
    params.delete("appPage")
    const qs = params.toString()
    return qs ? `/loans?${qs}` : "/loans"
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map(({ value, label }) => {
        const isActive = (value === null && current === null) || value === current
        return (
          <Link
            key={label}
            href={buildUrl(value)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors rounded-t-md -mb-px border-b-2",
              isActive
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
