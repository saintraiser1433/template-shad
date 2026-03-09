"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import type { Role } from "@prisma/client"

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
  password: z.string().optional(),
}).refine(
  (data) => !data.password || data.password.length >= 6,
  { message: "Password must be at least 6 characters", path: ["password"] }
)

type CreateFormData = z.infer<typeof createSchema>
type UpdateFormData = z.infer<typeof updateSchema>

type UserFormProps = {
  backHref: string
  userId?: string
  defaultValues?: {
    name: string
    email: string
    role: string
  }
}

export function UserForm({ backHref, userId, defaultValues }: UserFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(userId)

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema) as Resolver<CreateFormData>,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
    },
  })

  const updateForm = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema) as Resolver<UpdateFormData>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      role: defaultValues?.role ?? "",
      password: "",
    },
  })

  useEffect(() => {
    if (defaultValues) {
      updateForm.reset({
        name: defaultValues.name,
        role: defaultValues.role,
        password: "",
      })
    }
  }, [defaultValues, updateForm])

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
    router.push("/users")
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
        password: data.password || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to update user")
      return
    }
    router.push("/users")
    router.refresh()
  }

  if (isEdit) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit user</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update name, role, or reset password.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={updateForm.handleSubmit(onUpdate)}
            className="space-y-6"
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
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed.
                </p>
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
            <div className="flex gap-2">
              <Button type="submit" disabled={updateForm.formState.isSubmitting}>
                {updateForm.formState.isSubmitting ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={backHref}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create user</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add a new staff account with name, email, password, and role.
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={createForm.handleSubmit(onCreate)}
          className="space-y-6"
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
          <div className="flex gap-2">
            <Button type="submit" disabled={createForm.formState.isSubmitting}>
              {createForm.formState.isSubmitting ? "Creating…" : "Create user"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={backHref}>Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
