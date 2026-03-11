"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { formatDate } from "@/lib/date-format"

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "LOGIN", label: "Login" },
  { value: "USER_CREATED", label: "User created" },
  { value: "USER_UPDATED", label: "User updated" },
  { value: "USER_DEACTIVATED", label: "User deactivated" },
  { value: "USER_ACTIVATED", label: "User activated" },
  { value: "MEMBER_CREATED", label: "Member created" },
  { value: "MEMBER_UPDATED", label: "Member updated" },
  { value: "LOAN_TYPE_CREATED", label: "Loan type created" },
  { value: "LOAN_TYPE_UPDATED", label: "Loan type updated" },
  { value: "LOAN_TYPE_DELETED", label: "Loan type deleted" },
  { value: "REQUIREMENT_CREATED", label: "Requirement created" },
  { value: "REQUIREMENT_UPDATED", label: "Requirement updated" },
  { value: "REQUIREMENT_DELETED", label: "Requirement deleted" },
  { value: "APPLICATION_STATUS_CHANGED", label: "Application status changed" },
  { value: "APP_CIBI_APPROVED", label: "Collector: CI/BI approved" },
  { value: "APP_CIBI_REJECTED", label: "Collector: CI/BI rejected" },
  { value: "APP_MANAGER_APPROVED", label: "Manager: Approved" },
  { value: "APP_MANAGER_REJECTED", label: "Manager: Rejected" },
  { value: "APP_MANAGER_ENDORSED", label: "Manager: Endorsed to committee" },
  { value: "APP_COMMITTEE_ENDORSED", label: "Committee: Endorsed to board" },
  { value: "APP_COMMITTEE_REJECTED", label: "Committee: Rejected" },
  { value: "APP_BOARD_APPROVED", label: "Board: Approved" },
  { value: "APP_BOARD_REJECTED", label: "Board: Rejected" },
  { value: "APP_FUNDED", label: "Treasurer: Funded" },
  { value: "APP_RELEASED", label: "Treasurer: Released" },
  { value: "LOAN_CREATED", label: "Loan created" },
  { value: "LOAN_FUNDED", label: "Loan funded" },
  { value: "LOAN_RELEASED", label: "Loan released" },
  { value: "PAYMENT_RECORDED", label: "Payment recorded" },
  { value: "PAYMENT_APPROVED", label: "Payment approved" },
  { value: "PAYMENT_REJECTED", label: "Payment rejected" },
  { value: "VOUCHER_CREATED", label: "Voucher created" },
  { value: "REPORT_EXPORTED", label: "Report exported" },
]

const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "COLLECTOR", label: "Collector" },
  { value: "MANAGER", label: "Manager" },
  { value: "CREDIT_COMMITTEE", label: "Credit committee" },
  { value: "BOARD_OF_DIRECTORS", label: "Board of directors" },
  { value: "TREASURER", label: "Treasurer" },
  { value: "ADMIN", label: "Admin" },
  { value: "LOANS_CLERK", label: "Loans clerk" },
  { value: "DISBURSING_STAFF", label: "Disbursing staff" },
  { value: "CASHIER", label: "Cashier" },
]

const ENTITY_OPTIONS = [
  { value: "all", label: "All entities" },
  { value: "User", label: "User" },
  { value: "Member", label: "Member" },
  { value: "LoanProduct", label: "Loan type" },
  { value: "Requirement", label: "Requirement" },
  { value: "LoanApplication", label: "Loan application" },
  { value: "Loan", label: "Loan" },
  { value: "Payment", label: "Payment" },
]

function actionLabel(action: string): string {
  const opt = ACTION_OPTIONS.find((o) => o.value === action)
  return opt ? opt.label : action.replace(/_/g, " ")
}

function roleLabel(role: string): string {
  const opt = ROLE_OPTIONS.find((o) => o.value === role)
  return opt ? opt.label : role.replace(/_/g, " ")
}

type LogEntry = {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  details: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string; role?: string } | null
}

export function ActivityLogTable() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState("")
  const [entityFilter, setEntityFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    if (actionFilter) params.set("action", actionFilter)
    if (entityFilter) params.set("entityType", entityFilter)
    if (roleFilter) params.set("role", roleFilter)
    fetch(`/api/activity-log?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs)
        if (typeof data.total === "number") setTotal(data.total)
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [page, actionFilter, entityFilter, roleFilter])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Activity log</h2>
          <p className="text-sm text-muted-foreground">
            System activities by users. Filter by action or entity type.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Select value={actionFilter || "all"} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter || "all"} onValueChange={(v) => { setEntityFilter(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <EmptyState title="No activity logged yet" />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">Time</th>
                    <th className="px-3 py-1.5 text-left font-medium">User</th>
                    <th className="px-3 py-1.5 text-left font-medium">Role</th>
                    <th className="px-3 py-1.5 text-left font-medium">Action</th>
                    <th className="px-3 py-1.5 text-left font-medium">Entity</th>
                    <th className="px-3 py-1.5 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-3 py-1.5">
                        {log.user ? (
                          <span title={log.user.email}>
                            {log.user.name || log.user.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {log.user?.role ? roleLabel(log.user.role) : "—"}
                      </td>
                      <td className="px-3 py-1.5 font-medium">
                        {actionLabel(log.action)}
                      </td>
                      <td className="px-3 py-1.5">
                        {log.entityType ?? "—"}
                        {log.entityId ? ` (${log.entityId.slice(0, 8)}…)` : ""}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-1.5 text-muted-foreground">
                        {log.details ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>
                Page {page} of {Math.max(1, Math.ceil(total / 50))}
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
                disabled={page >= Math.ceil(total / 50)}
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
