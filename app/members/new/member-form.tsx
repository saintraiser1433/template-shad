"use client"

import { useState } from "react"
import Link from "next/link"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RELIGIONS } from "@/lib/religions"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  contactNo: z.string().optional(),
  religion: z.string().optional(),
  occupation: z.string().optional(),
  cbu: z.coerce.number().min(0).default(0),
  isRegularMember: z.boolean().default(false),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6).optional().or(z.literal("")),
})

type FormData = z.infer<typeof schema>

export function MemberForm({
  backHref,
  onCancel,
  onSuccess,
}: {
  backHref: string
  onCancel?: () => void
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      cbu: 0,
      isRegularMember: false,
      email: "",
      password: "",
    },
  })
  const isRegularMember = watch("isRegularMember")

  async function onSubmit(data: FormData) {
    setError(null)
    const payload = {
      name: data.name,
      address: data.address || undefined,
      contactNo: data.contactNo || undefined,
      religion: data.religion || undefined,
      occupation: data.occupation || undefined,
      cbu: data.cbu,
      isRegularMember: data.isRegularMember,
      email: data.email || undefined,
      password: data.password || undefined,
    }
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to create member")
      return
    }
    onSuccess?.()
    router.push(`/members/${json.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <FieldGroup>
          <p className="text-xs text-muted-foreground">
            Member number will be auto-assigned (e.g. MCF-001, MCF-002).
          </p>
          <Field>
            <FieldLabel htmlFor="name">Full name *</FieldLabel>
            <Input id="name" {...register("name")} placeholder="Juan Dela Cruz" />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="Address"
              rows={2}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactNo">Contact number</FieldLabel>
            <Input
              id="contactNo"
              {...register("contactNo")}
              placeholder="09xxxxxxxxx"
            />
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
          <Field>
            <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
            <Input id="occupation" {...register("occupation")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="cbu">Capital Build Up (CBU) ₱</FieldLabel>
            <Input
              id="cbu"
              type="number"
              step="0.01"
              min={0}
              {...register("cbu")}
            />
            <p className="text-xs text-muted-foreground">
              At least ₱20,000 CBU required for good standing (loan eligibility).
            </p>
          </Field>
          <Field className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRegularMember"
              {...register("isRegularMember")}
              className="rounded border-input"
            />
            <FieldLabel htmlFor="isRegularMember" className="!mt-0">
              Bona fide regular member
            </FieldLabel>
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Login email (optional)</FieldLabel>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="member@example.com"
            />
          </Field>
          {isRegularMember && (
            <Field>
              <FieldLabel htmlFor="password">
                Password (optional, for portal login)
              </FieldLabel>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="Min 6 characters"
              />
            </Field>
          )}
        </FieldGroup>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Create member"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="outline" asChild>
              <Link href={backHref}>Cancel</Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
