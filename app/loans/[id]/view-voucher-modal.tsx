"use client"

import { useState } from "react"
import { FileText, FileDown } from "lucide-react"
import { formatDate } from "@/lib/date-format"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type VoucherData = {
  voucherNo: string
  releaseMethod: string
  chequeNo: string | null
  releasedAt: Date | string
}

export function ViewVoucherModal({
  loanId,
  loanNo,
  memberLabel,
  voucher,
  buttonLabel,
  renewal,
}: {
  loanId: string
  loanNo: string
  memberLabel: string
  voucher: VoucherData
  buttonLabel?: string
  renewal?: { requestedAmount: number; deducted: number; reason: string }
}) {
  const [open, setOpen] = useState(false)
  const releasedAt = formatDate(voucher.releasedAt)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {buttonLabel ? (
          <Button variant="action" size="sm" title={buttonLabel}>
            <FileText className="mr-1.5 size-4" />
            {buttonLabel}
          </Button>
        ) : (
          <Button variant="action" size="icon-sm" title="View voucher">
            <FileText className="size-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent size="xs" className="max-w-xs">
        <AlertDialogTitle className="text-sm font-semibold">
          Voucher — {voucher.voucherNo}
        </AlertDialogTitle>
        <div className="space-y-3 pt-1 text-sm">
          <p className="text-muted-foreground">{loanNo} · {memberLabel}</p>
          <dl className="grid gap-1.5">
            {renewal && renewal.deducted > 0.01 && (
              <div className="rounded-md border bg-muted/30 px-2.5 py-2 text-xs">
                <p className="font-medium">Why is my disbursement lower?</p>
                <p className="mt-1 text-muted-foreground">{renewal.reason}</p>
                <div className="mt-2 grid gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Requested</span>
                    <span className="font-medium">
                      ₱{renewal.requestedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Deduction</span>
                    <span className="font-medium">
                      ₱{renewal.deducted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-1">
                    <span className="text-muted-foreground">Net proceeds</span>
                    <span className="font-medium">
                      ₱{(renewal.requestedAmount - renewal.deducted).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Release method</dt>
              <dd className="font-medium">{voucher.releaseMethod}</dd>
            </div>
            {voucher.chequeNo && (
              <div>
                <dt className="text-muted-foreground">Cheque no</dt>
                <dd className="font-medium">{voucher.chequeNo}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Released at</dt>
              <dd className="font-medium">{releasedAt}</dd>
            </div>
          </dl>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(`/api/loans/${loanId}/voucher/pdf`, "_blank", "noopener,noreferrer")
            }}
          >
            <FileDown className="size-4 mr-1" />
            Print / Save PDF
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
