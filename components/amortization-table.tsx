import { formatDate } from "@/lib/date-format"
import { formatPeso } from "@/lib/money-format"
import { StatusBadge } from "@/components/status-badge"

type ScheduleRow = {
  id: string
  dueDate: Date
  principal: number
  interest: number
  totalDue: number
  penalty: number
  paidAmount: number
  isPaid: boolean
  paidAt: Date | null
  sequence: number
  /** Optional fixed CBU credit for this period when fully paid. */
  cbuPerPeriod?: number
}

export function AmortizationTable({
  schedule,
  renderAction,
}: {
  schedule: ScheduleRow[]
  renderAction?: (row: ScheduleRow) => React.ReactNode
}) {
  const now = new Date()
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-1.5 text-left font-medium">#</th>
            <th className="px-3 py-1.5 text-left font-medium">Due date</th>
            <th className="px-3 py-1.5 text-right font-medium">Principal</th>
            <th className="px-3 py-1.5 text-right font-medium">Interest</th>
            <th className="px-3 py-1.5 text-right font-medium">Total due</th>
            <th className="px-3 py-1.5 text-right font-medium">Penalty</th>
            <th className="px-3 py-1.5 text-right font-medium">CBU added</th>
            <th className="px-3 py-1.5 text-left font-medium">Mode</th>
            <th className="px-3 py-1.5 text-left font-medium">Status</th>
            {renderAction && (
              <th className="px-3 py-1.5 text-right font-medium">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {schedule.map((row) => {
            const due = new Date(row.dueDate)
            const isOverdue = !row.isPaid && due < now
            const dueWithPenalty = row.totalDue + row.penalty
            const paid = row.paidAmount ?? 0
            const isPartial = !row.isPaid && paid > 0
            return (
              <tr
                key={row.id}
                className={`border-b transition-colors hover:bg-muted/30 ${
                  row.isPaid
                    ? "bg-muted/20"
                    : isPartial
                      ? "bg-amber-500/5"
                      : isOverdue
                        ? "bg-destructive/5"
                        : ""
                }`}
              >
                <td className="px-3 py-1.5">{row.sequence}</td>
                <td className="px-3 py-1.5">
                  {formatDate(due)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{formatPeso(row.principal)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{formatPeso(row.interest)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{formatPeso(row.totalDue)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{formatPeso(row.penalty)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {row.cbuPerPeriod != null && row.cbuPerPeriod > 0
                    ? `₱${formatPeso(row.cbuPerPeriod)}`
                    : "—"}
                </td>
                <td className="px-3 py-1.5">
                  {row.isPaid ? (
                    <StatusBadge status="PAID" label="Full payment" />
                  ) : isPartial ? (
                    <StatusBadge status="PARTIAL" label="Partial payment" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {row.isPaid ? (
                    <span className="flex items-center gap-1.5">
                      <StatusBadge status="PAID" />
                      {row.paidAt && (
                        <span className="text-muted-foreground text-[11px]">
                          {formatDate(row.paidAt)}
                        </span>
                      )}
                    </span>
                  ) : isPartial ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status="PARTIAL" />
                      <span className="text-muted-foreground text-[11px]">
                        ₱{formatPeso(paid)} / ₱{formatPeso(dueWithPenalty)}
                      </span>
                    </span>
                  ) : isOverdue ? (
                    <StatusBadge status="OVERDUE" />
                  ) : (
                    <StatusBadge status="PENDING" label="Pending" />
                  )}
                </td>
                {renderAction && (
                  <td className="px-3 py-1.5 text-right">
                    {renderAction(row)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
