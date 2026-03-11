"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date-format"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { StatusBadge } from "@/components/status-badge"
import { ViewPaymentDetailsButton } from "./view-payment-details"
import { ViewPaymentReceiptButton } from "./view-payment-receipt-button"

type SchedulePayment = {
  id: string
  amount: number
  principal: number
  interest: number
  penalty: number
  paymentDate: string
  status: string
  paymentMethod: string | null
  remarks: string | null
  referenceNo: string | null
  cbuAdded: number
  approvedByName?: string | null
}

export function SchedulePaymentsButton({
  scheduleLabel,
  payments,
  loanId,
  isFinanceOfficer,
}: {
  scheduleLabel: string
  payments: SchedulePayment[]
  loanId: string
  isFinanceOfficer: boolean
}) {
  const [open, setOpen] = useState(false)
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null)

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        title="View payments for this schedule"
        onClick={() => setOpen(true)}
      >
        $
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="w-[98vw] max-w-7xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Payments for {scheduleLabel}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mt-2 max-h-[60vh] min-h-0 overflow-auto text-xs sm:max-h-[70vh]">
            {payments.length === 0 ? (
              <p className="text-muted-foreground">
                No payments for this schedule yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[520px] text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-2 py-1 text-left font-medium">Date</th>
                      <th className="px-2 py-1 text-right font-medium">Amount</th>
                      <th className="px-2 py-1 text-left font-medium">Mode</th>
                      <th className="px-2 py-1 text-left font-medium">Status</th>
                      <th className="px-2 py-1 text-left font-medium">Approved by</th>
                      <th className="px-2 py-1 text-left font-medium">Receipt</th>
                      {isFinanceOfficer && (
                        <th className="px-2 py-1 text-right font-medium">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                  {payments.map((p) => {
                    const showViewDetails =
                      isFinanceOfficer &&
                      p.status === "PENDING_APPROVAL" &&
                      p.paymentMethod &&
                      p.paymentMethod.toUpperCase() !== "CASH"
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-2 py-1">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          ₱{p.amount.toLocaleString("en-PH")}
                        </td>
                        <td className="px-2 py-1">
                          {p.paymentMethod ?? "CASH"}
                        </td>
                        <td className="px-2 py-1">
                          <div>
                            <StatusBadge status={p.status} />
                            {p.status === "REJECTED" && p.remarks && (
                            expandedReasonId === p.id ? (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                Reason: {p.remarks}{" "}
                                <button
                                  type="button"
                                  className="underline"
                                  onClick={() => setExpandedReasonId(null)}
                                >
                                  Hide
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="mt-0.5 text-[11px] underline underline-offset-2"
                                onClick={() => setExpandedReasonId(p.id)}
                              >
                                View reason
                              </button>
                            )
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-muted-foreground">
                          {p.status === "APPROVED" ? (p.approvedByName ?? "—") : "—"}
                        </td>
                        <td className="px-2 py-1">
                          {p.status === "APPROVED" ? (
                            <ViewPaymentReceiptButton
                              loanId={loanId}
                              paymentId={p.id}
                              size="icon-sm"
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        {isFinanceOfficer && (
                          <td className="px-2 py-1 text-right">
                            {showViewDetails ? (
                              <ViewPaymentDetailsButton
                                loanId={loanId}
                                payment={{
                                  id: p.id,
                                  amount: p.amount,
                                  principal: p.principal,
                                  interest: p.interest,
                                  penalty: p.penalty,
                                  paymentDate: p.paymentDate,
                                  paymentMethod: p.paymentMethod,
                                  status: p.status,
                                }}
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

