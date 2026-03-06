"use client"

type ScheduleRow = {
  id: string
  dueDate: Date
  principal: number
  interest: number
  totalDue: number
  penalty: number
  isPaid: boolean
  paidAt: Date | null
  sequence: number
}

export function AmortizationTable({
  schedule,
}: {
  schedule: ScheduleRow[]
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
            <th className="px-3 py-1.5 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row) => {
            const due = new Date(row.dueDate)
            const isOverdue = !row.isPaid && due < now
            return (
              <tr
                key={row.id}
                className={`border-b transition-colors hover:bg-muted/30 ${
                  row.isPaid ? "bg-muted/20" : isOverdue ? "bg-destructive/5" : ""
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
                <td className="px-3 py-1.5">
                  {row.isPaid ? (
                    <span className="text-muted-foreground">
                      Paid
                      {row.paidAt &&
                        ` ${new Date(row.paidAt).toLocaleDateString("en-PH")}`}
                    </span>
                  ) : isOverdue ? (
                    <span className="text-destructive font-medium">Overdue</span>
                  ) : (
                    <span className="text-muted-foreground">Pending</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
