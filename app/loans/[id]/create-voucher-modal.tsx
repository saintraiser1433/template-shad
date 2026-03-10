"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { VoucherForm } from "./voucher/voucher-form"

const VOUCHER_FORM_ID = "create-voucher-form"

export function CreateVoucherModal({
  loanId,
  loanNo,
  hideReleaseMethod = true,
}: {
  loanId: string
  loanNo: string
  /** When true (Finance Officer or Admin), CASH is used and the release method dropdown is hidden. */
  hideReleaseMethod?: boolean
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="action" size="icon-sm" title="Create voucher">
          <FileText className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="xs" className="max-w-xs">
        <AlertDialogTitle className="text-sm font-semibold">
          Create voucher — Loan {loanNo}
        </AlertDialogTitle>
        <div className="space-y-4 pt-1">
          <VoucherForm
            loanId={loanId}
            loanNo={loanNo}
            onSuccess={handleSuccess}
            compact
            formId={VOUCHER_FORM_ID}
            hideReleaseMethod={hideReleaseMethod}
          />
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="submit" form={VOUCHER_FORM_ID} size="sm">
            Create
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
