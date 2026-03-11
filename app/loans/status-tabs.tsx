"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

const TABS: { value: string | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAID", label: "Paid" },
  { value: "DELINQUENT", label: "Delinquent" },
  { value: "RENEWED", label: "Renewed" },
]

function buildUrl(status: string | null, search?: string, size?: number): string {
  const params = new URLSearchParams()
  if (search?.trim()) params.set("search", search.trim())
  if (size && size !== 10) params.set("size", String(size))
  if (status) params.set("status", status)
  const qs = params.toString()
  return qs ? `/loans?${qs}` : "/loans"
}

export function StatusTabs({
  current,
  search,
  size = 10,
}: {
  current: string | null
  search?: string
  size?: number
}) {
  return (
    <>
      {TABS.map(({ value, label }) => {
        const isActive = (value === null && current === null) || value === current
        return (
          <Link
            key={label}
            href={buildUrl(value, search, size)}
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
    </>
  )
}
