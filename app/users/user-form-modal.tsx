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
import type { Role } from "@prisma/client"
import { toast } from "sonner"

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "COLLECTOR", label: "Collector" },
  { value: "CREDIT_COMMITTEE", label: "Credit Committee" },
  { value: "BOARD_OF_DIRECTORS", label: "Board of Directors" },
  // Finance Officer is represented by the TREASURER role in the enum
  { value: "TREASURER", label: "Finance Officer" },
]

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Select a role"),
})

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Select a role"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  password: z.string().optional(),
}).refine(
  (data) => !data.password || data.password.length >= 6,
  { message: "Password must be at least 6 characters", path: ["password"] }
)

type CreateFormData = z.infer<typeof createSchema>
type UpdateFormData = z.infer<typeof updateSchema>

type UserFormModalProps = {
  mode: "create" | "edit"
  userId?: string
  defaultValues?: { name: string; email: string; role: string; status: string }
  onSuccess: () => void
  onCancel: () => void
}

export function UserFormModal({
  mode,
  userId,
  defaultValues,
  onSuccess,
  onCancel,
}: UserFormModalProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema) as Resolver<CreateFormData>,
    defaultValues: { name: "", email: "", password: "", role: "" },
  })

  const updateForm = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema) as Resolver<UpdateFormData>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      role: defaultValues?.role ?? "",
      status: defaultValues?.status ?? "ACTIVE",
      password: "",
    },
  })

  useEffect(() => {
    if (mode === "edit" && defaultValues) {
      updateForm.reset({
        name: defaultValues.name,
        role: defaultValues.role,
        status: defaultValues.status ?? "ACTIVE",
        password: "",
      })
    }
  }, [mode, defaultValues, updateForm])

  async function onCreate(data: CreateFormData) {
    setError(null)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to create user")
      return
    }
    toast.success("User created")
    onSuccess()
    router.refresh()
  }

  async function onUpdate(data: UpdateFormData) {
    if (!userId) return
    setError(null)
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        role: data.role,
        status: data.status,
        password: data.password || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to update user")
      return
    }
    toast.success("User updated")
    onSuccess()
    router.refresh()
  }

  if (mode === "edit") {
    return (
      <form
        onSubmit={updateForm.handleSubmit(onUpdate)}
        className="space-y-4"
      >
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <FieldGroup>
          <Field>
            <FieldLabel>Name *</FieldLabel>
            <Input {...updateForm.register("name")} />
            {updateForm.formState.errors.name && (
              <p className="text-sm text-destructive">
                {updateForm.formState.errors.name.message}
              </p>
            )}
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              value={defaultValues?.email ?? ""}
              disabled
              className="bg-muted"
            />
          </Field>
              <Field>
                <FieldLabel>Role *</FieldLabel>
                <Select
                  value={updateForm.watch("role")}
                  onValueChange={(v) => updateForm.setValue("role", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={updateForm.watch("status")}
                  onValueChange={(v) =>
                    updateForm.setValue("status", v as "ACTIVE" | "INACTIVE")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>New password</FieldLabel>
            <Input
              type="password"
              placeholder="Leave blank to keep current"
              {...updateForm.register("password")}
            />
            {updateForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {updateForm.formState.errors.password.message}
              </p>
            )}
          </Field>
        </FieldGroup>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={updateForm.formState.isSubmitting}>
            {updateForm.formState.isSubmitting ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form
      onSubmit={createForm.handleSubmit(onCreate)}
      className="space-y-4"
    >
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel>Name *</FieldLabel>
          <Input {...createForm.register("name")} />
          {createForm.formState.errors.name && (
            <p className="text-sm text-destructive">
              {createForm.formState.errors.name.message}
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel>Email *</FieldLabel>
          <Input type="email" {...createForm.register("email")} />
          {createForm.formState.errors.email && (
            <p className="text-sm text-destructive">
              {createForm.formState.errors.email.message}
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel>Password *</FieldLabel>
          <Input type="password" {...createForm.register("password")} />
          {createForm.formState.errors.password && (
            <p className="text-sm text-destructive">
              {createForm.formState.errors.password.message}
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel>Role *</FieldLabel>
          <Select
            value={createForm.watch("role")}
            onValueChange={(v) => createForm.setValue("role", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={createForm.formState.isSubmitting}>
          {createForm.formState.isSubmitting ? "Creating…" : "Create user"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
