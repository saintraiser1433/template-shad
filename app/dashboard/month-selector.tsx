"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getMonthOptions() {
  const now = new Date()
  const options: { value: string; label: string }[] = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const value = `${y}-${String(m + 1).padStart(2, "0")}`
    const label = `${MONTH_NAMES[m]} ${y}`
    options.push({ value, label })
  }
  return options
}

const MONTH_OPTIONS = getMonthOptions()

export function MonthSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = new Date()
  const defaultMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
  const selected = searchParams.get("month")?.trim() || defaultMonth

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === defaultMonth) {
      params.delete("month")
    } else {
      params.set("month", value)
    }
    const qs = params.toString()
    router.push(qs ? `/dashboard?${qs}` : "/dashboard")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Period:</span>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
