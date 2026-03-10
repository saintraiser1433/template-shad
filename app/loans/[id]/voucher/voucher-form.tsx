"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const schema = z.object({
  releaseMethod: z.enum(["CASH", "CHEQUE"]),
  chequeNo: z.string().optional(),
  releasedAt: z.string().min(1, "Release date is required"),
})

type FormData = z.infer<typeof schema>

export function VoucherForm({
  loanId,
  loanNo,
  onSuccess,
  compact = false,
  formId,
  hideReleaseMethod = false,
}: {
  loanId: string
  loanNo: string
  onSuccess?: () => void
  compact?: boolean
  formId?: string
  /** When true (e.g. Finance Officer or Admin), default to CASH and hide the release method dropdown. */
  hideReleaseMethod?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      releaseMethod: "CASH",
      releasedAt: new Date().toISOString().slice(0, 16),
    },
  })

  const releaseMethod = watch("releaseMethod")
  const showReleaseMethodSelect = !hideReleaseMethod

  async function onSubmit(data: FormData) {
    setError(null)
    const res = await fetch(`/api/loans/${loanId}/voucher`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        releaseMethod: data.releaseMethod,
        chequeNo: data.releaseMethod === "CHEQUE" ? data.chequeNo : undefined,
        releasedAt: new Date(data.releasedAt).toISOString(),
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to create voucher")
      return
    }
    toast.success("Voucher created")
    if (onSuccess) {
      onSuccess()
    } else {
      router.push(`/loans/${loanId}/voucher`)
    }
    router.refresh()
  }

  const formContent = (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      className={compact ? "space-y-4" : "space-y-6"}
    >
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {showReleaseMethodSelect && (
        <div className="space-y-2">
          <Label>Release method</Label>
          <Select
            value={releaseMethod}
            onValueChange={(v) => setValue("releaseMethod", v as "CASH" | "CHEQUE")}
          >
            <SelectTrigger className={compact ? "h-9" : ""}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {showReleaseMethodSelect && releaseMethod === "CHEQUE" && (
        <div className="space-y-2">
          <Label>Cheque number</Label>
          <Input
            {...register("chequeNo")}
            placeholder="e.g. CHQ-001"
            className={compact ? "h-9" : ""}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Release date</Label>
        <Input
          type="datetime-local"
          {...register("releasedAt")}
          className={compact ? "h-9" : ""}
        />
      </div>
      {(!compact || !formId) && (
        <div className={compact ? "flex gap-2 pt-1" : "flex gap-2"}>
          <Button type="submit" disabled={isSubmitting} size={compact ? "sm" : "default"}>
            {isSubmitting ? "Creating…" : "Create voucher"}
          </Button>
        </div>
      )}
    </form>
  )

  if (compact) {
    return formContent
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Create loan voucher</CardTitle>
        <p className="text-sm text-muted-foreground">Loan {loanNo}</p>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}
