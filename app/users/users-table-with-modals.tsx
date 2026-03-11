"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ModuleHeader } from "@/components/module-header"
import { TableSearchForm } from "@/components/table-search-form"
import { TablePagination } from "@/components/ui/table-pagination"
import { EmptyState } from "@/components/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserFormModal } from "./user-form-modal"
import { UserPlus, Pencil, UserX, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/date-format"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  COLLECTOR: "Collector",
  CREDIT_COMMITTEE: "Credit Committee",
  BOARD_OF_DIRECTORS: "Board of Directors",
  TREASURER: "Treasurer",
  LOANS_CLERK: "Loans Clerk",
  DISBURSING_STAFF: "Disbursing Staff",
  CASHIER: "Cashier",
  MEMBER: "Member",
}

type UserRow = {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  createdAt: Date
}

export function UsersTableWithModals({
  users,
  currentUserId,
  search,
  breadcrumb,
  title = "Users",
  subtitle = "Manage staff accounts and roles.",
}: {
  users: UserRow[]
  currentUserId: string
  search?: string
  breadcrumb: React.ReactNode
  title?: string
  subtitle?: string
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deactivateUser, setDeactivateUser] = useState<UserRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function openEdit(u: UserRow) {
    setEditUser(u)
    setEditOpen(true)
  }

  async function handleDeactivate() {
    if (!deactivateUser) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/users/${deactivateUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INACTIVE" }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to deactivate user")
        return
      }
      toast.success("User deactivated")
      setDeactivateUser(null)
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleActivate(u: UserRow) {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? "Failed to activate user")
        return
      }
      toast.success("User activated")
      router.refresh()
    } catch {
      toast.error("Failed to activate user")
    }
  }

  return (
    <>
      <ModuleHeader breadcrumb={breadcrumb} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <TableSearchForm
          basePath="/users"
          defaultSearch={search}
          placeholder="Search by name or email..."
        />
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 size-4" />
          Add user
        </Button>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <EmptyState message="No users found." className="py-12" />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">Name</th>
                    <th className="px-3 py-1.5 text-left font-medium">Email</th>
                    <th className="px-3 py-1.5 text-left font-medium">Role</th>
                    <th className="px-3 py-1.5 text-left font-medium">Status</th>
                    <th className="px-3 py-1.5 text-left font-medium">Created</th>
                    <th className="px-3 py-1.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-3 py-1.5 font-medium">{u.name ?? "—"}</td>
                      <td className="px-3 py-1.5">{u.email}</td>
                      <td className="px-3 py-1.5">
                        <Badge variant="secondary">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5">
                        <StatusBadge
                          status={u.status}
                          label={u.status === "ACTIVE" ? "Active" : "Inactive"}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="action"
                            size="icon-sm"
                            onClick={() => openEdit(u)}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {u.id !== currentUserId &&
                            (u.status === "ACTIVE" ? (
                              <Button
                                variant="action"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeactivateUser(u)}
                                title="Deactivate"
                              >
                                <UserX className="size-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="action"
                                size="icon-sm"
                                onClick={() => handleActivate(u)}
                                title="Activate user"
                              >
                                <UserCheck className="size-4" />
                              </Button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination totalItems={users.length} />
          </>
        )}
      </CardContent>
      </Card>
      </div>

      {/* Add user modal */}
      <AlertDialog open={addOpen} onOpenChange={setAddOpen}>
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Add user</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new staff account with name, email, password, and role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 max-h-[70vh] overflow-y-auto pt-2">
            <UserFormModal
              mode="create"
              onSuccess={() => setAddOpen(false)}
              onCancel={() => setAddOpen(false)}
            />
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit user modal */}
      <AlertDialog open={editOpen} onOpenChange={(open) => !open && setEditUser(null)}>
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit user</AlertDialogTitle>
            <AlertDialogDescription>
              Update name, role, or reset password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 max-h-[70vh] overflow-y-auto pt-2">
            {editUser && (
              <UserFormModal
                mode="edit"
                userId={editUser.id}
                defaultValues={{
                  name: editUser.name ?? "",
                  email: editUser.email,
                  role: editUser.role,
                  status: editUser.status ?? "ACTIVE",
                }}
                onSuccess={() => {
                  setEditOpen(false)
                  setEditUser(null)
                }}
                onCancel={() => {
                  setEditOpen(false)
                  setEditUser(null)
                }}
              />
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirmation dialog */}
      <AlertDialog
        open={!!deactivateUser}
        onOpenChange={(open) => !open && setDeactivateUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the user account
              {deactivateUser?.name ? ` for ${deactivateUser.name}` : ""}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeactivateUser(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeactivate()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
