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
            const totalDue = row.totalDue + row.penalty
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
                  {due.toLocaleDateString("en-PH")}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{row.principal.toLocaleString("en-PH")}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{row.interest.toLocaleString("en-PH")}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{row.totalDue.toLocaleString("en-PH")}
                </td>
                <td className="px-3 py-1.5 text-right">
                  ₱{row.penalty.toLocaleString("en-PH")}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {row.cbuPerPeriod != null && row.cbuPerPeriod > 0
                    ? `₱${row.cbuPerPeriod.toLocaleString("en-PH")}`
                    : "—"}
                </td>
                <td className="px-3 py-1.5">
                  {row.isPaid ? (
                    <span className="text-muted-foreground">
                      Paid
                      {row.paidAt &&
                        ` ${new Date(row.paidAt).toLocaleDateString("en-PH")}`}
                    </span>
                  ) : isPartial ? (
                    <span className="text-amber-700 font-medium">
                      Partial — ₱{paid.toLocaleString("en-PH")} / ₱
                      {totalDue.toLocaleString("en-PH")}
                    </span>
                  ) : isOverdue ? (
                    <span className="text-destructive font-medium">Overdue</span>
                  ) : (
                    <span className="text-muted-foreground">Pending</span>
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
