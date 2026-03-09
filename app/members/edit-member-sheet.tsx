"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RELIGIONS } from "@/lib/religions"
import { toast } from "sonner"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  religion: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type MemberData = { id: string; memberNo: string; name: string; religion: string | null }

export function EditMemberSheet({
  memberId,
  open,
  onOpenChange,
}: {
  memberId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { name: "", religion: "" },
  })

  useEffect(() => {
    if (!open || !memberId) {
      setMember(null)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/members/${memberId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.id) {
          setMember({
            id: data.id,
            memberNo: data.memberNo ?? "",
            name: data.name ?? "",
            religion: data.religion ?? null,
          })
          reset({ name: data.name ?? "", religion: data.religion ?? "" })
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load member")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // Only re-run when open or memberId change; reset is from RHF and can change ref each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, memberId])

  async function onSubmit(data: FormData) {
    if (!memberId) return
    const res = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, religion: data.religion || null }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? "Failed to update member")
      return
    }
    toast.success("Member updated")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit member</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="mt-2 max-h-[70vh] overflow-y-auto pt-2">
          {loading && !member ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : member ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Member number</FieldLabel>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
                    {member.memberNo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-assigned; cannot be changed.
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-name">Full name *</FieldLabel>
                  <Input
                    id="edit-name"
                    {...register("name")}
                    placeholder="Juan Dela Cruz"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Religion</FieldLabel>
                  <Select
                    value={watch("religion") ?? ""}
                    onValueChange={(v) => setValue("religion", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select religion" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELIGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
