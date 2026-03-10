"use client"

import { useState } from "react"
import { FileText, FileDown } from "lucide-react"
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
}: {
  loanId: string
  loanNo: string
  memberLabel: string
  voucher: VoucherData
}) {
  const [open, setOpen] = useState(false)
  const releasedAt = new Date(voucher.releasedAt).toLocaleString()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="action" size="icon-sm" title="View voucher">
          <FileText className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="xs" className="max-w-xs">
        <AlertDialogTitle className="text-sm font-semibold">
          Voucher — {voucher.voucherNo}
        </AlertDialogTitle>
        <div className="space-y-3 pt-1 text-sm">
          <p className="text-muted-foreground">{loanNo} · {memberLabel}</p>
          <dl className="grid gap-1.5">
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
