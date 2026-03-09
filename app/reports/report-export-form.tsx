"use client"

import { useState } from "react"
import { FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const REPORT_OPTIONS = [
  { value: "loans", label: "Loans (outstanding)" },
  { value: "collections", label: "Collections (payments)" },
  { value: "members", label: "Members" },
] as const

const FORMAT_OPTIONS = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "pdf", label: "PDF (.pdf)" },
] as const

export function ReportExportForm() {
  const [reportType, setReportType] = useState<string>("loans")
  const [format, setFormat] = useState<string>("xlsx")
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const url = `/api/reports/export?type=${encodeURIComponent(reportType)}&format=${encodeURIComponent(format)}`
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Export failed")
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const filename = match?.[1] ?? `report_${reportType}_${new Date().toISOString().slice(0, 10)}.${format}`
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label className="text-xs">Report type</Label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[200px]" size="default">
            <SelectValue placeholder="Select report" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="w-[160px]" size="default">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleExport}
        disabled={loading}
        className="gap-2"
      >
        <FileDown className="size-4" />
        {loading ? "Generating…" : "Download"}
      </Button>
    </div>
  )
}
