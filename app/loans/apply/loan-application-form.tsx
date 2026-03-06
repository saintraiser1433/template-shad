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
import { LoanTypeOption, formatTerm, formatMaxAmount } from "./loan-type-cards"

type MemberOption = { id: string; memberNo: string; name: string; cbu: number }

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
}: {
  members: MemberOption[]
  loanProducts?: LoanTypeOption[]
  defaultMemberId?: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<LoanTypeOption | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema) as Resolver<ApplicationFormData>,
    defaultValues: {
      memberId: defaultMemberId ?? "",
      amount: 0,
      termMonths: undefined,
      termDays: undefined,
      purpose: "",
    },
  })

  const memberId = watch("memberId")
  const amount = watch("amount")

  useEffect(() => {
    if (!selectedProduct) return
    if (selectedProduct.termMonthsMin != null && selectedProduct.termMonthsMax != null) {
      setValue("termMonths", selectedProduct.termMonthsMin)
      setValue("termDays", undefined as unknown as number)
    } else if (selectedProduct.termDaysMin != null && selectedProduct.termDaysMax != null) {
      setValue("termDays", selectedProduct.termDaysMin)
      setValue("termMonths", undefined as unknown as number)
    }
  }, [selectedProduct, setValue])

  const selectedMember = useMemo(
    () => members.find((m) => m.id === memberId),
    [members, memberId]
  )

  const maxAmount = useMemo(() => {
    if (!selectedMember || !selectedProduct) return 0
    if (selectedProduct.maxCbuPercent != null && selectedProduct.maxAmountFixed == null) {
      return selectedMember.cbu * (selectedProduct.maxCbuPercent / 100)
    }
    if (selectedProduct.maxAmountFixed != null) return selectedProduct.maxAmountFixed
    return Number.MAX_SAFE_INTEGER
  }, [selectedMember, selectedProduct])

  const hasTermMonths =
    selectedProduct?.termMonthsMin != null && selectedProduct?.termMonthsMax != null
  const hasTermDays =
    selectedProduct?.termDaysMin != null && selectedProduct?.termDaysMax != null

  async function onSubmit(data: ApplicationFormData) {
    if (!selectedProduct) return
    setError(null)
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: data.memberId,
        loanProductId: selectedProduct.id,
        amount: data.amount,
        termMonths: data.termMonths,
        termDays: data.termDays,
        purpose: data.purpose,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to submit application")
      return
    }
    router.push("/loans/pending")
    router.refresh()
  }

  function clearSelection() {
    setSelectedProduct(null)
  }

  return (
    <div className="space-y-6">
      {loanProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a loan type</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click a card to apply for that loan. The form below will show interest and penalty for the selected type.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {selectedProduct ? (
        <Card className="max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Loan application — {selectedProduct.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Amount to borrow, purpose, and terms below. Interest and penalty are set by the loan type.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
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
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <FieldGroup>
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
                <Field>
                  <FieldLabel>Amount to borrow (₱) *</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={maxAmount < Number.MAX_SAFE_INTEGER ? maxAmount : undefined}
                    {...register("amount")}
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
                      {...register("termMonths")}
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
                      {...register("termDays")}
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
              </FieldGroup>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        loanProducts.length > 0 && (
          <Card className="max-w-2xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p className="text-sm">Select a loan type above to fill out the application.</p>
            </CardContent>
          </Card>
        )
      )}

      {loanProducts.length === 0 && (
        <Card className="max-w-2xl border-amber-200 dark:border-amber-900">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No loan types are configured. Ask an administrator to add loan types first.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
