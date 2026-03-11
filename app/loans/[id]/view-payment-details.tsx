"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/date-format"
import { Textarea } from "@/components/ui/textarea"

type PaymentRow = {
  id: string
  amount: number
  principal: number
  interest: number
  penalty: number
  paymentDate: string
  paymentMethod: string | null
  status: string
}

export function ViewPaymentDetailsButton({
  loanId,
  payment,
}: {
  loanId: string
  payment: PaymentRow
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/loans/${loanId}/payments/${payment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to approve payment")
        return
      }
      toast.success("Payment approved")
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setRejectConfirmOpen(false)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/loans/${loanId}/payments/${payment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            rejectionReason: rejectionReason || undefined,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to reject payment")
        return
      }
      toast.success("Payment rejected")
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const dateStr = formatDate(payment.paymentDate)
  const methodLabel = payment.paymentMethod ?? "—"
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  async function loadReceipt() {
    try {
      const res = await fetch(`/api/documents?paymentId=${payment.id}`)
      if (!res.ok) return
      const docs = await res.json()
      const receipt = Array.isArray(docs)
        ? docs.find((d) => d.category === "PAYMENT_RECEIPT")
        : null
      setReceiptUrl(receipt?.fileUrl ?? null)
    } catch {
      setReceiptUrl(null)
    }
  }

  return (
    <>
      <Button
        variant="action"
        size="icon-sm"
        title="View payment details"
        onClick={() => setOpen(true)}
      >
        <Eye className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Payment details</AlertDialogTitle>
            <AlertDialogDescription>
              Member-submitted payment (non-cash). Review and approve or reject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                ₱{payment.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment method</span>
              <span>{methodLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>{payment.status}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Receipt</span>
              {receiptUrl ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline underline-offset-3"
                >
                  View <ExternalLink className="size-3" />
                </a>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadReceipt}
                  disabled={loading}
                >
                  Load
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            If approved, this amount will be applied to the loan’s current unpaid schedule
            and the remaining balance will be updated.
          </p>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRejectConfirmOpen(true)}
              disabled={loading}
            >
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? "Processing…" : "Approve"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the payment of ₱
              {payment.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}{" "}
              ({methodLabel}). The member will need to submit again if they wish to pay. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Reason for rejection (optional, visible to member)
              </span>
              <Textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Amount does not match receipt, unclear reference, etc."
              />
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleReject()
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Rejecting…" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
