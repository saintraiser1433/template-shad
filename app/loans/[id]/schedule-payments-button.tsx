"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { ViewPaymentDetailsButton } from "./view-payment-details"

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
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Payments for {scheduleLabel}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="mt-2 max-h-80 overflow-y-auto text-xs">
            {payments.length === 0 ? (
              <p className="text-muted-foreground">
                No payments for this schedule yet.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-2 py-1 text-left font-medium">Date</th>
                    <th className="px-2 py-1 text-left font-medium">Amount</th>
                    <th className="px-2 py-1 text-left font-medium">Principal</th>
                    <th className="px-2 py-1 text-left font-medium">Interest</th>
                    <th className="px-2 py-1 text-left font-medium">Penalty</th>
                    <th className="px-2 py-1 text-left font-medium">Method</th>
                    <th className="px-2 py-1 text-left font-medium">Status</th>
                    <th className="px-2 py-1 text-left font-medium">Reference #</th>
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
                          {new Date(p.paymentDate).toLocaleDateString("en-PH")}
                        </td>
                        <td className="px-2 py-1">
                          ₱{p.amount.toLocaleString("en-PH")}
                        </td>
                        <td className="px-2 py-1">
                          ₱{p.principal.toLocaleString("en-PH")}
                        </td>
                        <td className="px-2 py-1">
                          ₱{p.interest.toLocaleString("en-PH")}
                        </td>
                        <td className="px-2 py-1">
                          ₱{p.penalty.toLocaleString("en-PH")}
                        </td>
                        <td className="px-2 py-1">{p.paymentMethod ?? "—"}</td>
                        <td className="px-2 py-1">
                          <div>{p.status}</div>
                          {p.status === "REJECTED" && p.remarks && (
                            expandedReasonId === p.id ? (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                {p.remarks}
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
                        </td>
                        <td className="px-2 py-1">{p.referenceNo ?? ""}</td>
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

