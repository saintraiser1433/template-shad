"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

const voucherSchema = z.object({
  releaseMethod: z.enum(["CASH", "CHEQUE"]),
  chequeNo: z.string().optional(),
  releasedAt: z.string().min(1, "Release date is required"),
})

type VoucherFormData = z.infer<typeof voucherSchema>

export function CreateLoanFromApplication({
  applicationId,
  applicationNo,
  memberName,
}: {
  applicationId: string
  applicationNo?: string
  memberName?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherSchema) as Resolver<VoucherFormData>,
    defaultValues: {
      releaseMethod: "CASH",
      releasedAt: new Date().toISOString().slice(0, 16),
    },
  })

  const releaseMethod = watch("releaseMethod")

  async function onSubmit(data: VoucherFormData) {
    setError(null)
    const res = await fetch(
      `/api/applications/${applicationId}/create-loan-with-voucher`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseMethod: data.releaseMethod,
          chequeNo: data.releaseMethod === "CHEQUE" ? data.chequeNo : undefined,
          releasedAt: new Date(data.releasedAt).toISOString(),
        }),
      }
    )
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to create loan and voucher")
      return
    }
    toast.success("Loan and voucher created")
    setOpen(false)
    window.dispatchEvent(new Event("activity-log-updated"))
    router.push(`/loans/${json.id}`)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="action"
        size="icon-sm"
        onClick={() => setOpen(true)}
        disabled={isSubmitting}
        title={isSubmitting ? "Creating…" : "Create loan"}
      >
        <Wallet className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create voucher</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              Complete the voucher first. The loan will be created and appear after you submit.
              {applicationNo && (
                <span className="mt-1 block font-medium">
                  Application {applicationNo}
                  {memberName ? ` · ${memberName}` : ""}
                </span>
              )}
            </p>
          </AlertDialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label>Release method</Label>
              <Select
                value={releaseMethod}
                onValueChange={(v) =>
                  setValue("releaseMethod", v as "CASH" | "CHEQUE")
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {releaseMethod === "CHEQUE" && (
              <div className="space-y-2">
                <Label>Cheque number</Label>
                <Input
                  {...register("chequeNo")}
                  placeholder="e.g. CHQ-001"
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Release date</Label>
              <Input
                type="datetime-local"
                {...register("releasedAt")}
                className="h-9"
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <AlertDialogCancel type="button" disabled={isSubmitting}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? "Creating…" : "Submit"}
              </Button>
            </div>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
