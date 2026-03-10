"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Banknote } from "lucide-react"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type PaymentMethodOption = {
  id: string
  accountName: string
  accountNumber: string
  type: string
  status: string
}

const CASH_OPTION: PaymentMethodOption = {
  id: "CASH",
  type: "CASH",
  accountName: "Cash",
  accountNumber: "",
  status: "ACTIVE",
}

type RecordPaymentButtonProps = {
  loanId: string
  /** Show "Pay" label (e.g. in amortization table). Default icon-only. */
  showLabel?: boolean
  /**
   * When paying for a specific schedule row.
   * - totalDue + penalty = original schedule amount
   * - remainingDue = amount still owed for this row (after previous payments)
   */
  scheduleRow?: { totalDue: number; penalty: number; remainingDue?: number }
  /** When paying for a specific schedule row, link payment to this schedule id. */
  scheduleRowId?: string
  /** When no schedule (e.g. header button), full amount = outstanding balance. */
  outstandingBalance?: number
  /** When true (finance officer recording), payment method is always CASH and applied immediately. */
  isFinanceOfficer?: boolean
  /** When true, member cannot open the Pay dialog (e.g. while a payment is pending approval). */
  disabled?: boolean
  /** Optional tooltip/title explaining why the button is disabled. */
  disabledReason?: string
}

function formatPeso(value: number): string {
  if (Number.isNaN(value) || value < 0) return "₱0.00"
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parsePesoInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

export function RecordPaymentButton({
  loanId,
  showLabel,
  scheduleRow,
  outstandingBalance = 0,
  isFinanceOfficer = false,
  scheduleRowId,
  disabled = false,
  disabledReason,
}: RecordPaymentButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState<string>("")
  const [modePartial, setModePartial] = useState(true)
  const [modeFull, setModeFull] = useState(false)
  const [amountRaw, setAmountRaw] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptUploading, setReceiptUploading] = useState(false)
  const [receiptDocId, setReceiptDocId] = useState<string | null>(null)
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null)
  const [referenceNo, setReferenceNo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fullAmount = scheduleRow
    ? (scheduleRow.remainingDue ??
      Math.max(0, scheduleRow.totalDue + scheduleRow.penalty))
    : Math.max(0, outstandingBalance)
  const optionsWithCash =
    isFinanceOfficer
      ? [CASH_OPTION, ...paymentMethods.filter((m) => m.type.toUpperCase() !== "CASH")]
      : paymentMethods
  const selectedMethod = optionsWithCash.find((m) => m.id === selectedMethodId)
  const isCashSelected = selectedMethod?.type.toUpperCase() === "CASH"

  const fetchPaymentMethods = useCallback(async () => {
    const res = await fetch("/api/payment-methods")
    if (!res.ok) return
    const data = await res.json()
    setPaymentMethods(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    if (open) {
      fetchPaymentMethods()
      setSelectedMethodId("")
      setModePartial(true)
      setModeFull(false)
      setAmountRaw("")
      setReceiptFile(null)
      setReceiptDocId(null)
      setError(null)
    }
  }, [open, fetchPaymentMethods])

  // Cleanup preview URL when it changes or component unmounts
  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl)
      }
    }
  }, [receiptPreviewUrl])

  useEffect(() => {
    if (open && modeFull) {
      setAmountRaw(fullAmount.toFixed(2))
    }
  }, [open, modeFull, fullAmount])

  const amountNum = parsePesoInput(amountRaw)
  const isPartialValid = modePartial && amountNum > 0 && amountNum < fullAmount
  const isFullValid =
    modeFull && fullAmount > 0 && Math.abs(amountNum - fullAmount) < 0.01
  const isMemberOnline = !isFinanceOfficer && !isCashSelected
  const canSubmit = selectedMethodId && (isPartialValid || isFullValid)

  async function uploadReceiptIfNeeded(): Promise<string | null> {
    if (!isMemberOnline) return null
    if (receiptDocId) return receiptDocId
    if (!receiptFile) {
      setError("Receipt/evidence of payment is required.")
      return null
    }
    setReceiptUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", receiptFile)
      formData.set("category", "PAYMENT_RECEIPT")
      const res = await fetch("/api/documents", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to upload receipt")
        return null
      }
      setReceiptDocId(json.id)
      return json.id as string
    } finally {
      setReceiptUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return
    const receiptDocumentId = await uploadReceiptIfNeeded()
    if (isMemberOnline && !receiptDocumentId) return
    const finalAmount = modeFull ? fullAmount : amountNum
    if (finalAmount <= 0) {
      setError("Enter a valid amount")
      return
    }
    if (modePartial && finalAmount >= fullAmount) {
      setError("Partial payment must be less than the schedule amount.")
      return
    }
    if (isMemberOnline && !referenceNo.trim()) {
      setError("Reference number is required for online payments.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/loans/${loanId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          paymentDate: new Date().toISOString(),
          paymentMethod: selectedMethod?.type ?? undefined,
          receiptDocumentId: receiptDocumentId ?? undefined,
          scheduleId: scheduleRowId ?? undefined,
          referenceNo: referenceNo || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to record payment")
        toast.error(json.error ?? "Failed to record payment")
        return
      }
      setOpen(false)
      router.refresh()
      toast.success("Payment submitted")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="action"
        size={showLabel ? "sm" : "icon-sm"}
        title={disabled ? disabledReason || "You have a payment pending approval." : "Record payment"}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen(true)
        }}
      >
        <Banknote className="size-4" />
        {showLabel && <span className="ml-1.5">Pay</span>}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Pay online</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel>Payment method</FieldLabel>
                <Select
                  value={selectedMethodId}
                  onValueChange={setSelectedMethodId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsWithCash.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.type} — {m.accountName || m.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {!isCashSelected && (
                <>
                  <Field>
                    <FieldLabel>Account number</FieldLabel>
                    <Input
                      value={selectedMethod?.accountNumber ?? ""}
                      disabled
                      className="bg-muted"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Account name</FieldLabel>
                    <Input
                      value={selectedMethod?.accountName ?? ""}
                      disabled
                      className="bg-muted"
                    />
                  </Field>
                </>
              )}
              {isMemberOnline && (
                <Field>
                  <FieldLabel>Upload receipt / evidence *</FieldLabel>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        if (receiptPreviewUrl) {
                          URL.revokeObjectURL(receiptPreviewUrl)
                        }
                        setReceiptFile(f)
                        setReceiptDocId(null)
                        if (f) {
                          setReceiptPreviewUrl(URL.createObjectURL(f))
                        } else {
                          setReceiptPreviewUrl(null)
                        }
                      }}
                      className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-input file:bg-muted/30 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Required for online payments. Allowed: PDF, images, Word.
                    </p>
                    {receiptDocId && (
                      <p className="text-[11px] text-muted-foreground">
                        Receipt uploaded.
                      </p>
                    )}
                    {!receiptDocId && receiptFile && (
                      <div className="mt-1 space-y-1 rounded-md border bg-muted/40 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium truncate">
                            {receiptFile.name}
                          </span>
                          {receiptPreviewUrl && (
                            <button
                              type="button"
                              className="text-[11px] underline underline-offset-2"
                              onClick={() => {
                                window.open(receiptPreviewUrl, "_blank", "noopener,noreferrer")
                              }}
                            >
                              Preview file
                            </button>
                          )}
                        </div>
                        {receiptPreviewUrl &&
                          receiptFile.type.startsWith("image/") && (
                            <div className="mt-1">
                              <Label className="mb-1 block text-[11px] text-muted-foreground">
                                Image preview
                              </Label>
                              <img
                                src={receiptPreviewUrl}
                                alt="Receipt preview"
                                className="max-h-40 w-auto rounded-md border bg-background"
                              />
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </Field>
              )}
              <Field>
                <FieldLabel>Reference number{isMemberOnline ? " *" : ""}</FieldLabel>
                <Input
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. GCASH ref, bank code"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isMemberOnline
                    ? "Required for online payments. Enter the transaction or reference number from the payment slip."
                    : "Optional. Enter the transaction or reference number from the payment slip."}
                </p>
              </Field>
              <Field>
                <div className="flex items-center gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={modePartial}
                      onChange={() => {
                        setModePartial(true)
                        setModeFull(false)
                        setAmountRaw("")
                      }}
                      className="size-4 rounded border-input"
                    />
                    Partial payment
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={modeFull}
                      onChange={() => {
                        setModeFull(true)
                        setModePartial(false)
                        setAmountRaw(fullAmount.toFixed(2))
                      }}
                      className="size-4 rounded border-input"
                    />
                    Full payment
                  </label>
                </div>
                {fullAmount > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Remaining amount for this schedule: {formatPeso(fullAmount)}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel>Amount</FieldLabel>
                <div className="flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tabular-nums">
                  <span className="text-muted-foreground">₱</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={modeFull ? fullAmount.toFixed(2) : amountRaw}
                    onChange={(e) => {
                      if (modeFull) return
                      const v = e.target.value.replace(/[^\d.]/g, "")
                      const parts = v.split(".")
                      if (parts.length > 2) return
                      if (parts[1]?.length > 2) return
                      setAmountRaw(v)
                    }}
                    disabled={modeFull}
                    placeholder="0.00"
                    className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                {modePartial && amountRaw && amountNum >= fullAmount && (
                  <p className="mt-1 text-xs text-destructive">
                    Partial payment must be less than {formatPeso(fullAmount)}.
                  </p>
                )}
              </Field>
            </FieldGroup>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={loading || !canSubmit}>
                {loading || receiptUploading ? "Saving…" : "Submit payment"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
