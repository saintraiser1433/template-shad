"use client"

import { useState } from "react"
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
}: {
  loanId: string
  loanNo: string
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
    router.push(`/loans/${loanId}/voucher`)
    router.refresh()
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Create loan voucher</CardTitle>
        <p className="text-sm text-muted-foreground">
          Loan {loanNo}. Record release method and date.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel>Release method *</FieldLabel>
              <Select
                value={releaseMethod}
                onValueChange={(v) => setValue("releaseMethod", v as "CASH" | "CHEQUE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {releaseMethod === "CHEQUE" && (
              <Field>
                <FieldLabel>Cheque number</FieldLabel>
                <Input {...register("chequeNo")} placeholder="e.g. CHQ-001" />
              </Field>
            )}
            <Field>
              <FieldLabel>Release date *</FieldLabel>
              <Input type="datetime-local" {...register("releasedAt")} />
            </Field>
          </FieldGroup>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create voucher"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
