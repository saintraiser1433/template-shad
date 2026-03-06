"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/sonner"

const schema = z
  .object({
    name: z.string().min(1, "Loan type name is required"),
    termMonthsMin: z.coerce.number().int().min(0).optional().or(z.nan()),
    termMonthsMax: z.coerce.number().int().min(0).optional().or(z.nan()),
    termDaysMin: z.coerce.number().int().min(0).optional().or(z.nan()),
    termDaysMax: z.coerce.number().int().min(0).optional().or(z.nan()),
    maxCbuPercent: z.coerce.number().min(0).max(100).optional().or(z.nan()),
    maxAmountFixed: z.coerce.number().min(0).optional().or(z.nan()),
    amortization: z.string().min(1, "Amortization is required"),
    interestRate: z.coerce.number().min(0, "Interest rate must be ≥ 0"),
    interestLabel: z.string().min(1, "Interest description is required"),
  penaltyRate: z.coerce.number().min(0, "Penalty rate must be ≥ 0"),
  penaltyLabel: z.string().min(1, "Penalty description is required"),
  })
  .superRefine((val, ctx) => {
    const mMin = val.termMonthsMin
    const mMax = val.termMonthsMax
    if (
      typeof mMin === "number" &&
      typeof mMax === "number" &&
      !Number.isNaN(mMin) &&
      !Number.isNaN(mMax) &&
      mMax < mMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termMonthsMax"],
        message: "Max months must be greater than or equal to min months",
      })
    }

    const dMin = val.termDaysMin
    const dMax = val.termDaysMax
    if (
      typeof dMin === "number" &&
      typeof dMax === "number" &&
      !Number.isNaN(dMin) &&
      !Number.isNaN(dMax) &&
      dMax < dMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termDaysMax"],
        message: "Max days must be greater than or equal to min days",
      })
    }
  })

type FormData = z.infer<typeof schema>

export function LoanTypeForm({
  id,
  defaultValues,
}: {
  id?: string
  defaultValues?: Partial<FormData>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      name: "",
      amortization: "Monthly",
      interestRate: 0.03,
      interestLabel: "3% per month diminishing",
      penaltyRate: 0.02,
      penaltyLabel: "2% per month based on amortization delayed",
      ...defaultValues,
    },
  })

  const [termMode, setTermMode] = useState<"months" | "days" | "both">("months")

  async function onSubmit(data: FormData) {
    setError(null)

    const body = {
      ...data,
      termMonthsMin: Number.isNaN(data.termMonthsMin) ? undefined : data.termMonthsMin,
      termMonthsMax: Number.isNaN(data.termMonthsMax) ? undefined : data.termMonthsMax,
      termDaysMin: Number.isNaN(data.termDaysMin) ? undefined : data.termDaysMin,
      termDaysMax: Number.isNaN(data.termDaysMax) ? undefined : data.termDaysMax,
      maxCbuPercent: Number.isNaN(data.maxCbuPercent)
        ? undefined
        : data.maxCbuPercent,
      maxAmountFixed: Number.isNaN(data.maxAmountFixed)
        ? undefined
        : data.maxAmountFixed,
    }

    const res = await fetch(
      id ? `/api/loan-products/${id}` : "/api/loan-products",
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? "Failed to save loan type")
      return
    }

    toast.success(id ? "Loan type updated" : "Loan type created")
    router.push("/loan-types")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Loan type name *</FieldLabel>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </Field>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Term unit:</span>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="termMode"
              value="months"
              checked={termMode === "months"}
              onChange={() => setTermMode("months")}
            />
            <span>Months only</span>
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="termMode"
              value="days"
              checked={termMode === "days"}
              onChange={() => setTermMode("days")}
            />
            <span>Days only</span>
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="termMode"
              value="both"
              checked={termMode === "both"}
              onChange={() => setTermMode("both")}
            />
            <span>Both (advanced)</span>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="termMonthsMin">Term (months) min</FieldLabel>
            <Input
              id="termMonthsMin"
              type="number"
              disabled={termMode === "days"}
              {...register("termMonthsMin")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="termMonthsMax">Term (months) max</FieldLabel>
            <Input
              id="termMonthsMax"
              type="number"
              disabled={termMode === "days"}
              {...register("termMonthsMax")}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="termDaysMin">Term (days) min</FieldLabel>
            <Input
              id="termDaysMin"
              type="number"
              disabled={termMode === "months"}
              {...register("termDaysMin")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="termDaysMax">Term (days) max</FieldLabel>
            <Input
              id="termDaysMax"
              type="number"
              disabled={termMode === "months"}
              {...register("termDaysMax")}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="maxCbuPercent">
              Max % of CBU (e.g. 80 for 80%)
            </FieldLabel>
            <Input
              id="maxCbuPercent"
              type="number"
              step="0.01"
              {...register("maxCbuPercent")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="maxAmountFixed">
              Max fixed amount (₱)
            </FieldLabel>
            <Input
              id="maxAmountFixed"
              type="number"
              step="0.01"
              {...register("maxAmountFixed")}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="amortization">Amortization *</FieldLabel>
          <Input
            id="amortization"
            placeholder="Monthly"
            disabled
            {...register("amortization")}
          />
          {errors.amortization && (
            <p className="text-sm text-destructive">
              {errors.amortization.message}
            </p>
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="interestRate">
              Interest rate (decimal, e.g. 0.03 for 3%)
            </FieldLabel>
            <Input
              id="interestRate"
              type="number"
              step="0.0001"
              {...register("interestRate")}
            />
            {errors.interestRate && (
              <p className="text-sm text-destructive">
                {errors.interestRate.message}
              </p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="penaltyRate">
              Penalty rate (decimal, e.g. 0.02 for 2%)
            </FieldLabel>
            <Input
              id="penaltyRate"
              type="number"
              step="0.0001"
              {...register("penaltyRate")}
            />
            {errors.penaltyRate && (
              <p className="text-sm text-destructive">
                {errors.penaltyRate.message}
              </p>
            )}
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="interestLabel">
            Interest description *
          </FieldLabel>
          <Textarea
            id="interestLabel"
            rows={2}
            placeholder="e.g. 3% per month diminishing"
            {...register("interestLabel")}
          />
          {errors.interestLabel && (
            <p className="text-sm text-destructive">
              {errors.interestLabel.message}
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="penaltyLabel">
            Penalty description *
          </FieldLabel>
          <Textarea
            id="penaltyLabel"
            rows={2}
            placeholder="e.g. 2% per month based on amortization delayed"
            {...register("penaltyLabel")}
          />
          {errors.penaltyLabel && (
            <p className="text-sm text-destructive">
              {errors.penaltyLabel.message}
            </p>
          )}
        </Field>
      </FieldGroup>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : id ? "Update loan type" : "Create loan type"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/loan-types")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

