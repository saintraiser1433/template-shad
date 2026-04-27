"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoanTypeOption, formatTerm, formatMaxAmount, formatCbuRequirement } from "./loan-type-cards"
import { CheckCircle2, XCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { computeAmortization } from "@/lib/loan-calculator"
import { getMonthlyScheduleMethodForLoanType } from "@/lib/loan-config"

type AmortizationEnum = "MONTHLY" | "DAILY" | "LUMPSUM"

function normalizeAmortization(raw: unknown): AmortizationEnum {
  if (raw === "MONTHLY" || raw === "DAILY" || raw === "LUMPSUM") return raw
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (s === "monthly") return "MONTHLY"
  if (s === "daily") return "DAILY"
  if (s === "lumpsum" || s === "lump sum" || s === "lump-sum") return "LUMPSUM"
  return "MONTHLY"
}
import { toast } from "sonner"
import { checkRenewalEligibility } from "@/lib/loan-calculator"

type MemberOption = { id: string; memberNo: string; name: string; cbu: number }
type ExistingLoanInfo = {
  id: string
  loanNo: string
  status: string
  principalAmount: number
  outstandingBalance: number
}

const applicationSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  amount: z.coerce.number().positive("Amount must be positive"),
  termMonths: z.coerce.number().int().min(1).optional(),
  termDays: z.coerce.number().int().min(1).optional(),
  purpose: z.string().optional(),
})

type ApplicationFormData = z.infer<typeof applicationSchema>

export function LoanApplicationForm({
  members,
  loanProducts = [],
  defaultMemberId,
  currentMemberId,
}: {
  members: MemberOption[]
  loanProducts?: LoanTypeOption[]
  defaultMemberId?: string
  /** When set (e.g. member role), the applicant is fixed to this member and selector is hidden. */
  currentMemberId?: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<LoanTypeOption | null>(null)
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [existingLoan, setExistingLoan] = useState<ExistingLoanInfo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [requirementFiles, setRequirementFiles] = useState<Record<string, File | null>>({})
  const [optionalFiles, setOptionalFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema) as Resolver<ApplicationFormData>,
    defaultValues: {
      memberId: currentMemberId ?? defaultMemberId ?? "",
      amount: 0,
      termMonths: undefined,
      termDays: undefined,
      purpose: "",
    },
  })

  useEffect(() => {
    if (currentMemberId) setValue("memberId", currentMemberId)
  }, [currentMemberId, setValue])

  const memberId = watch("memberId")
  const amount = watch("amount")
  const termMonths = watch("termMonths")
  const termDays = watch("termDays")

  const loanSummary = useMemo(() => {
    if (!selectedProduct || !amount || amount <= 0) return null
    const amortization = normalizeAmortization(selectedProduct.amortization)
    const amort = normalizeAmortization(selectedProduct.amortization)
    const monthsTermPresent =
      selectedProduct.termMonthsMin != null && selectedProduct.termMonthsMax != null
    const daysTermPresent =
      selectedProduct.termDaysMin != null && selectedProduct.termDaysMax != null
    const hasMonthsTerm =
      amort !== "DAILY" &&
      monthsTermPresent &&
      ((selectedProduct.termMonthsMin ?? 0) > 0 || (selectedProduct.termMonthsMax ?? 0) > 0)
    const hasDaysTerm = amort === "DAILY" ? daysTermPresent : (!hasMonthsTerm && daysTermPresent)

    const months = hasMonthsTerm
      ? (termMonths ?? selectedProduct.termMonthsMin ?? 0)
      : 0
    const days = hasDaysTerm
      ? (termDays ?? selectedProduct.termDaysMin ?? 0)
      : 0

    let periods = 0
    if (amortization === "DAILY") {
      const d = Math.max(0, Number(days) || 0)
      periods = d
    } else {
      periods = Math.max(0, Number(months) || 0)
    }

    if (!Number.isFinite(periods) || periods <= 0) return null

    const rows = computeAmortization(
      amount,
      selectedProduct.interestRate,
      periods,
      amortization,
      new Date(),
      amortization === "MONTHLY"
        ? {
            monthlyScheduleMethod: getMonthlyScheduleMethodForLoanType("MEMBERSHIP_LOAN"),
          }
        : undefined
    )
    if (!rows || rows.length === 0) return null

    const perPeriodPayment = rows[0].totalDue
    const totalInterest = rows.reduce((sum, r) => sum + (r.interest ?? 0), 0)
    const penaltyExample = perPeriodPayment * (selectedProduct.penaltyRate ?? 0)
    return {
      n: rows.length,
      monthlyPayment: perPeriodPayment,
      totalInterest,
      penaltyExample,
      isMonths: amortization === "MONTHLY",
    }
  }, [selectedProduct, amount, termMonths, termDays])

  const selectedProductId = selectedProduct?.id
  useEffect(() => {
    if (!selectedProduct) return
    const amort = normalizeAmortization(selectedProduct.amortization)
    if (
      amort === "DAILY" &&
      selectedProduct.termDaysMin != null &&
      selectedProduct.termDaysMax != null
    ) {
      setValue("termDays", selectedProduct.termDaysMin)
      setValue("termMonths", undefined as unknown as number)
      return
    }
    if (selectedProduct.termMonthsMin != null && selectedProduct.termMonthsMax != null) {
      setValue("termMonths", selectedProduct.termMonthsMin)
      setValue("termDays", undefined as unknown as number)
    } else if (selectedProduct.termDaysMin != null && selectedProduct.termDaysMax != null) {
      setValue("termDays", selectedProduct.termDaysMin)
      setValue("termMonths", undefined as unknown as number)
    }
    // Use product id so we don't re-run when the product object reference changes (e.g. parent re-render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId])

  const selectedMember = useMemo(
    () => members.find((m) => m.id === memberId),
    [members, memberId]
  )

  useEffect(() => {
    if (!memberId) {
      setExistingLoan(null)
      return
    }
    let cancelled = false
    fetch(`/api/loans?memberId=${encodeURIComponent(memberId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        const current = list
          .filter((l: any) =>
            ["ACTIVE", "DELINQUENT"].includes(String(l.status ?? "").toUpperCase())
          )
          .sort(
            (a: any, b: any) =>
              new Date(String(b.createdAt ?? 0)).getTime() -
              new Date(String(a.createdAt ?? 0)).getTime()
          )[0]
        if (!current) {
          setExistingLoan(null)
          return
        }
        setExistingLoan({
          id: String(current.id),
          loanNo: String(current.loanNo),
          status: String(current.status),
          principalAmount: Number(current.principalAmount ?? 0),
          outstandingBalance: Number(current.outstandingBalance ?? 0),
        })
      })
      .catch(() => {
        if (!cancelled) setExistingLoan(null)
      })
    return () => {
      cancelled = true
    }
  }, [memberId])

  const renewal = useMemo(() => {
    if (!existingLoan) return null
    if (!Number.isFinite(existingLoan.principalAmount) || existingLoan.principalAmount <= 0) return null
    if (!Number.isFinite(existingLoan.outstandingBalance) || existingLoan.outstandingBalance <= 0.01) return null
    const paid = Math.max(0, existingLoan.principalAmount - existingLoan.outstandingBalance)
    const eligible = checkRenewalEligibility(paid, existingLoan.principalAmount)
    const percentPaid = (paid / existingLoan.principalAmount) * 100
    return {
      eligible,
      paid,
      percentPaid,
      deducted: existingLoan.outstandingBalance,
      loanNo: existingLoan.loanNo,
      status: existingLoan.status,
    }
  }, [existingLoan])

  const maxAmount = useMemo(() => {
    if (!selectedMember || !selectedProduct) return 0
    if (selectedProduct.maxAmountFixed != null) return selectedProduct.maxAmountFixed
    return Number.MAX_SAFE_INTEGER
  }, [selectedMember, selectedProduct])

  const amortizationType = normalizeAmortization(selectedProduct?.amortization)
  const monthsPresent =
    selectedProduct?.termMonthsMin != null && selectedProduct?.termMonthsMax != null
  const daysPresent =
    selectedProduct?.termDaysMin != null && selectedProduct?.termDaysMax != null

  // Prefer days for DAILY amortization. Also treat 0–0 months as “not set”.
  const hasTermMonths =
    amortizationType !== "DAILY" &&
    monthsPresent &&
    ((selectedProduct?.termMonthsMin ?? 0) > 0 || (selectedProduct?.termMonthsMax ?? 0) > 0)
  const hasTermDays = amortizationType === "DAILY" ? daysPresent : daysPresent

  async function onSubmit(_data: ApplicationFormData) {
    setUploading(true)
    try {
      const id = await ensureApplicationId()
      if (!id) return

      const uploads: Array<Promise<void>> = []

      for (const [reqId, file] of Object.entries(requirementFiles)) {
        if (!file) continue
        const formData = new FormData()
        formData.set("file", file)
        formData.set("applicationId", id)
        formData.set("category", "REQUIREMENT")
        formData.set("requirementId", reqId)
        uploads.push(
          fetch("/api/documents", { method: "POST", body: formData }).then(async (res) => {
            if (!res.ok) {
              let message = "Upload failed"
              try {
                const json = await res.json()
                if (json?.error) message = json.error
              } catch {
                // ignore
              }
              throw new Error(message)
            }
          })
        )
      }

      for (const file of optionalFiles) {
        const formData = new FormData()
        formData.set("file", file)
        formData.set("applicationId", id)
        formData.set("category", "REQUIREMENT")
        uploads.push(
          fetch("/api/documents", { method: "POST", body: formData }).then(async (res) => {
            if (!res.ok) {
              let message = "Upload failed"
              try {
                const json = await res.json()
                if (json?.error) message = json.error
              } catch {
                // ignore
              }
              throw new Error(message)
            }
          })
        )
      }

      if (uploads.length > 0) {
        await Promise.all(uploads)
      }

      setConfirmOpen(false)
      toast.success("Application submitted successfully.")
      router.push("/loans")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to submit application"
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  function clearSelection() {
    setSelectedProduct(null)
  }

  async function ensureApplicationId(): Promise<string | null> {
    if (submittedApplicationId) return submittedApplicationId
    if (!selectedProduct) {
      setError("Select a loan type first.")
      return null
    }
    const values = getValues()
    const amountNum = Number(values.amount)
    const termMonthsNum = values.termMonths != null ? Number(values.termMonths) : undefined
    const termDaysNum = values.termDays != null ? Number(values.termDays) : undefined

    if (!values.memberId) {
      setError("Select a member before uploading documents.")
      return null
    }
    if (!amountNum || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid loan amount before uploading documents.")
      return null
    }

    const amort = normalizeAmortization(selectedProduct.amortization)
    const monthsTermPresent =
      selectedProduct.termMonthsMin != null && selectedProduct.termMonthsMax != null
    const daysTermPresent =
      selectedProduct.termDaysMin != null && selectedProduct.termDaysMax != null
    const hasMonthsTerm =
      amort !== "DAILY" &&
      monthsTermPresent &&
      ((selectedProduct.termMonthsMin ?? 0) > 0 || (selectedProduct.termMonthsMax ?? 0) > 0)
    const hasDaysTerm = amort === "DAILY" ? daysTermPresent : (!hasMonthsTerm && daysTermPresent)

    if (hasMonthsTerm) {
      if (!termMonthsNum || Number.isNaN(termMonthsNum) || termMonthsNum <= 0) {
        setError("Enter a valid term in months before uploading documents.")
        return null
      }
    } else if (hasDaysTerm) {
      if (!termDaysNum || Number.isNaN(termDaysNum) || termDaysNum <= 0) {
        setError("Enter a valid term in days before uploading documents.")
        return null
      }
    }
    setError(null)
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: values.memberId,
        loanProductId: selectedProduct.id,
        amount: values.amount,
        termMonths: values.termMonths,
        termDays: values.termDays,
        purpose: values.purpose,
      }),
    })
    let json: any = null
    try {
      json = await res.json()
    } catch {
      json = null
    }
    if (!res.ok) {
      setError(json.error ?? "Failed to save application")
      return null
    }
    setSubmittedApplicationId(json.id)
    return json.id as string
  }

  function handleClear() {
    setError(null)
    setSelectedProduct(null)
    setSubmittedApplicationId(null)
    setRequirementFiles({})
    setOptionalFiles([])
    reset({
      memberId: currentMemberId ?? defaultMemberId ?? "",
      amount: 0,
      termMonths: undefined,
      termDays: undefined,
      purpose: "",
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Loan types */}
      {loanProducts.length > 0 && (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Choose a loan type</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click a card to apply for that loan. The form on the right will show interest and penalty for the selected type.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {loanProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProduct(p)}
                  className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:border-primary hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    selectedProduct?.id === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <span className="font-semibold">{p.name}</span>
                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="font-normal">
                      {formatTerm(p)}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {formatMaxAmount(p)}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {formatCbuRequirement(p)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Interest: {p.interestLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Penalty: {p.penaltyLabel}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Right: Loan application */}
      {selectedProduct ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Loan application — {selectedProduct.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Amount to borrow, purpose, and terms below. Interest and penalty are set by the loan type.
              </p>
            </div>
            <Button type="button" variant="action" size="sm" onClick={clearSelection}>
              Change type
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-medium text-muted-foreground">Interest</p>
              <p>{selectedProduct.interestLabel}</p>
              <p className="mt-2 font-medium text-muted-foreground">Penalty</p>
              <p>{selectedProduct.penaltyLabel}</p>
              <p className="mt-2 font-medium text-muted-foreground">Amortization</p>
              <p>{selectedProduct.amortization}</p>
              <p className="mt-2 font-medium text-muted-foreground">
                Minimum CBU requirement
              </p>
              <div className="flex items-center gap-2">
                {selectedProduct.requiresGoodStanding === false ? (
                  <>
                    <XCircle className="size-4 text-muted-foreground" />
                    <p>No minimum ₱20,000 CBU required</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <p>Requires regular member + at least ₱20,000 CBU</p>
                  </>
                )}
              </div>
              {selectedProduct.maxCbuPercent != null && amount > 0 && (
                <>
                  <p className="mt-2 font-medium text-muted-foreground">CBU requirement</p>
                  <p>
                    Required CBU: ₱
                    {(amount * (selectedProduct.maxCbuPercent / 100)).toLocaleString("en-PH")} (Loan amount ₱
                    {amount.toLocaleString("en-PH")} × {selectedProduct.maxCbuPercent}%)
                  </p>
                </>
              )}
            </div>
            {loanSummary && (
              <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                <p className="font-medium">Loan summary (estimate)</p>
                {renewal?.deducted != null && renewal.deducted > 0.01 && (
                  <p className="mt-1 text-muted-foreground">
                    Renewal: existing loan {renewal.loanNo} ({renewal.percentPaid.toFixed(0)}% paid)
                  </p>
                )}
                {selectedProduct.maxCbuPercent != null && amount > 0 && (
                  <>
                    <p className="mt-1">
                      Existing CBU: ₱{selectedMember?.cbu.toLocaleString("en-PH") ?? "-"}
                    </p>
                    <p className="mt-1">
                      CBU requirement ({selectedProduct.maxCbuPercent}% of loan): ₱
                      {(amount * (selectedProduct.maxCbuPercent / 100)).toLocaleString("en-PH")}
                    </p>
                    {loanSummary.n > 0 && (
                      <p className="mt-1">
                        CBU per {loanSummary.isMonths ? "month" : "period"}: ₱
                        {(
                          (amount * (selectedProduct.maxCbuPercent / 100)) /
                          loanSummary.n
                        ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {loanSummary.n > 0 && (
                      <p className="mt-1">
                        Total {loanSummary.isMonths ? "monthly" : "per period"} payment (loan + CBU): ₱
                        {(
                          loanSummary.monthlyPayment +
                          (amount * (selectedProduct.maxCbuPercent / 100)) / loanSummary.n
                        ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {selectedMember && (
                      <p className="mt-1">
                        Total CBU after loan: ₱
                        {(
                          selectedMember.cbu +
                          amount * (selectedProduct.maxCbuPercent / 100)
                        ).toLocaleString("en-PH")}
                      </p>
                    )}
                    <p className="mt-1">
                      Total disbursement (amount - CBU requirement): ₱
                      {(
                        amount -
                        amount * (selectedProduct.maxCbuPercent / 100)
                      ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </p>
                    {renewal?.deducted != null && renewal.deducted > 0.01 && (
                      <p className="mt-1">
                        Renewal deduction (remaining balance): ₱
                        {renewal.deducted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {renewal?.deducted != null && renewal.deducted > 0.01 && (
                      <p className="mt-1 font-medium">
                        Net proceeds (after CBU + renewal deduction): ₱
                        {(
                          amount -
                          amount * (selectedProduct.maxCbuPercent / 100) -
                          renewal.deducted
                        ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </>
                )}
                <p className="mt-1">
                  {loanSummary.isMonths ? "Monthly" : "Per period"} payment: ₱
                  {loanSummary.monthlyPayment.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-1">
                  Total interest (approx.): ₱
                  {loanSummary.totalInterest.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Penalty example ({((selectedProduct.penaltyRate ?? 0) * 100).toFixed(0)}% of amortization): ₱
                  {loanSummary.penaltyExample.toLocaleString("en-PH", { minimumFractionDigits: 2 })} per period
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <FieldGroup>
                {currentMemberId ? (
                  <Field>
                    <FieldLabel>Applicant</FieldLabel>
                    <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {selectedMember?.name} ({selectedMember?.memberNo}) — CBU: ₱
                      {selectedMember?.cbu.toLocaleString("en-PH")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You are applying as the logged-in member.
                    </p>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>Member *</FieldLabel>
                    <Select
                      value={memberId}
                      onValueChange={(v) => setValue("memberId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.memberNo}) — CBU: ₱
                            {m.cbu.toLocaleString("en-PH")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.memberId && (
                      <p className="text-sm text-destructive">
                        {errors.memberId.message}
                      </p>
                    )}
                  </Field>
                )}
                <Field>
                  <FieldLabel>Amount to borrow (₱) *</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={maxAmount < Number.MAX_SAFE_INTEGER ? maxAmount : undefined}
                    {...register("amount", { valueAsNumber: true })}
                  />
                  {maxAmount < Number.MAX_SAFE_INTEGER && (
                    <p className="text-xs text-muted-foreground">
                      Max: ₱{maxAmount.toLocaleString("en-PH")}
                    </p>
                  )}
                  {errors.amount && (
                    <p className="text-sm text-destructive">
                      {errors.amount.message}
                    </p>
                  )}
                </Field>
                {hasTermMonths && (
                  <Field>
                    <FieldLabel>Term (months) *</FieldLabel>
                    <Input
                      type="number"
                      min={selectedProduct.termMonthsMin ?? 1}
                      max={selectedProduct.termMonthsMax ?? 120}
                      {...register("termMonths", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {selectedProduct.termMonthsMin} to {selectedProduct.termMonthsMax} months
                    </p>
                  </Field>
                )}
                {hasTermDays && !hasTermMonths && (
                  <Field>
                    <FieldLabel>Term (days) *</FieldLabel>
                    <Input
                      type="number"
                      min={selectedProduct.termDaysMin ?? 1}
                      max={selectedProduct.termDaysMax ?? 365}
                      {...register("termDays", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {selectedProduct.termDaysMin} to {selectedProduct.termDaysMax} days
                    </p>
                  </Field>
                )}
                <Field>
                  <FieldLabel>Purpose</FieldLabel>
                  <Textarea {...register("purpose")} rows={2} placeholder="e.g. Working capital, education, emergency" />
                </Field>
                {selectedProduct.requirements && selectedProduct.requirements.length > 0 ? (
                  <Field>
                    <FieldLabel>Required documents</FieldLabel>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Choose one file per requirement. Files will be uploaded when you submit the application.
                    </p>
                    <div className="space-y-1 rounded-lg border p-3">
                      {selectedProduct.requirements.map((r) => (
                        <div key={r.id} className="py-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-medium text-sm">{r.name}</span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null
                                  setRequirementFiles((prev) => ({ ...prev, [r.id]: file }))
                                }}
                                disabled={isSubmitting || uploading}
                                className="max-w-[260px]"
                              />
                              {requirementFiles[r.id] ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setRequirementFiles((prev) => ({ ...prev, [r.id]: null }))
                                  }
                                  disabled={isSubmitting || uploading}
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          {requirementFiles[r.id] ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Selected: {requirementFiles[r.id]!.name}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>Upload documents (optional)</FieldLabel>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Select files now; they’ll be uploaded when you submit the application.
                    </p>
                    <Input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        setOptionalFiles(files)
                      }}
                      disabled={isSubmitting || uploading}
                    />
                    {optionalFiles.length > 0 ? (
                      <div className="mt-2 rounded border bg-muted/30 p-2 text-xs">
                        <p className="font-medium">Selected files</p>
                        <ul className="mt-1 space-y-1">
                          {optionalFiles.map((f) => (
                            <li key={`${f.name}-${f.size}-${f.lastModified}`}>{f.name}</li>
                          ))}
                        </ul>
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setOptionalFiles([])}
                            disabled={isSubmitting || uploading}
                          >
                            Clear files
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </Field>
                )}
              </FieldGroup>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={isSubmitting || uploading}
                  onClick={() => setConfirmOpen(true)}
                >
                  {isSubmitting || uploading ? "Submitting…" : "Submit application"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={isSubmitting || uploading}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : loanProducts.length > 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">Select a loan type on the left to fill out the application.</p>
          </CardContent>
        </Card>
      ) : null}

      {loanProducts.length === 0 && (
        <Card className="border-amber-200 dark:border-amber-900 lg:col-span-2">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No loan types are configured. Ask an administrator to add loan types first.
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit loan application?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            This will save your loan application and move it to the pending queue for review.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleSubmit(onSubmit)()
              }}
            >
              Confirm submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
