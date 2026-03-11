"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { formatDate } from "@/lib/date-format"

const ACTION_LABELS: Record<string, string> = {
  APP_CIBI_APPROVED: "Submitted to manager / CI-BI passed",
  APP_CIBI_REJECTED: "CI/BI rejected",
}

const PAGE_SIZE = 20

type LogEntry = {
  id: string
  action: string
  entityId: string | null
  details: string | null
  createdAt: string
}

export function MySubmitToManagerHistoryTable() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/my-approval-history?page=${page}&type=collector_submissions`)
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs)
        if (typeof data.total === "number") setTotal(data.total)
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [page])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-base font-semibold">History of my submit to manager / CI-BI passed</h2>
          <p className="text-sm text-muted-foreground">
            Applications you submitted to manager (CI/BI passed) or rejected at CI/BI. Only your actions are shown.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <EmptyState title="No submit to manager or CI/BI actions yet" />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">Date</th>
                    <th className="px-3 py-1.5 text-left font-medium">Application</th>
                    <th className="px-3 py-1.5 text-left font-medium">Action</th>
                    <th className="px-3 py-1.5 text-left font-medium">Details</th>
                    <th className="px-3 py-1.5 text-right font-medium">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-3 py-1.5 font-medium">
                        {log.details?.split(" · ")[0] ?? (log.entityId ? `Application (${log.entityId.slice(0, 8)}…)` : "—")}
                      </td>
                      <td className="px-3 py-1.5">
                        {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ")}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-1.5 text-muted-foreground" title={log.details ?? undefined}>
                        {log.details ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {log.entityId ? (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                            <Link href="/loans">View loans</Link>
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>
                {total === 0 ? "0" : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)}`} of {total} row(s)
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pageCount}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
