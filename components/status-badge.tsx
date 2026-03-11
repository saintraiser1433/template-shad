"use client"

import { cn } from "@/lib/utils"

const GRADIENT_CLASSES: Record<string, string> = {
  // Loan status
  ACTIVE: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0",
  PAID: "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0",
  DELINQUENT: "bg-gradient-to-r from-red-500 to-rose-600 text-white border-0",
  RENEWED: "bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0",
  // Payment status
  PENDING_APPROVAL: "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 border-0",
  APPROVED: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0",
  REJECTED: "bg-gradient-to-r from-red-500 to-rose-600 text-white border-0",
  // Application status
  PENDING: "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 border-0",
  CIBI_REVIEW: "bg-gradient-to-r from-sky-400 to-blue-500 text-white border-0",
  MANAGER_REVIEW: "bg-gradient-to-r from-indigo-400 to-blue-500 text-white border-0",
  COMMITTEE_REVIEW: "bg-gradient-to-r from-violet-400 to-purple-500 text-white border-0",
  BOARD_REVIEW: "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-0",
  FUNDED: "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0",
  RELEASED: "bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-0",
  // User / member
  INACTIVE: "bg-gradient-to-r from-slate-400 to-slate-500 text-white border-0",
  GOOD_STANDING: "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0",
  NOT_ELIGIBLE: "bg-gradient-to-r from-slate-400 to-slate-500 text-white border-0",
  "NOT ELIGIBLE": "bg-gradient-to-r from-slate-400 to-slate-500 text-white border-0",
  // Amortization / schedule row
  PARTIAL: "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 border-0",
  OVERDUE: "bg-gradient-to-r from-red-500 to-rose-600 text-white border-0",
}

const baseClasses =
  "inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap border"

function getGradientClass(status: string): string {
  const key = status.replace(/\s+/g, " ").toUpperCase()
  return (
    GRADIENT_CLASSES[key] ??
    GRADIENT_CLASSES[key.replace(/_/g, " ")] ??
    "bg-gradient-to-r from-slate-500 to-slate-600 text-white border-0"
  )
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string
  label?: string
  className?: string
}) {
  const displayText = label ?? status.replace(/_/g, " ")
  const gradientClass = getGradientClass(status)
  return (
    <span
      className={cn(baseClasses, gradientClass, className)}
      data-status={status}
    >
      {displayText}
    </span>
  )
}
