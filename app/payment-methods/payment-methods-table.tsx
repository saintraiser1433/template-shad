"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableSearchForm } from "@/components/table-search-form"
import { TablePagination } from "@/components/ui/table-pagination"
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
import { StatusBadge } from "@/components/status-badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const

type PaymentMethodRow = {
  id: string
  accountName: string
  accountNumber: string
  type: string
  status: "ACTIVE" | "INACTIVE"
}

export function PaymentMethodsTable({
  paymentMethods,
  defaultSearch,
}: {
  paymentMethods: PaymentMethodRow[]
  defaultSearch?: string
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<PaymentMethodRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<PaymentMethodRow | null>(null)
  const [addAccountName, setAddAccountName] = useState("")
  const [addAccountNumber, setAddAccountNumber] = useState("")
  const [addType, setAddType] = useState("")
  const [editAccountName, setEditAccountName] = useState("")
  const [editAccountNumber, setEditAccountNumber] = useState("")
  const [editType, setEditType] = useState("")
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleAdd() {
    if (!addAccountName.trim() || !addAccountNumber.trim() || !addType.trim())
      return
    setSaving(true)
    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: addAccountName.trim(),
          accountNumber: addAccountNumber.trim(),
          type: addType.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to add payment method")
        return
      }
      toast.success("Payment method added")
      setAddOpen(false)
      setAddAccountName("")
      setAddAccountNumber("")
      setAddType("")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function openEdit(row: PaymentMethodRow) {
    setEditRow(row)
    setEditAccountName(row.accountName)
    setEditAccountNumber(row.accountNumber)
    setEditType(row.type)
    setEditStatus(row.status)
    setEditOpen(true)
  }

  async function handleEdit() {
    if (!editRow) return
    if (
      !editAccountName.trim() ||
      !editAccountNumber.trim() ||
      !editType.trim()
    )
      return
    setSaving(true)
    try {
      const res = await fetch(`/api/payment-methods/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: editAccountName.trim(),
          accountNumber: editAccountNumber.trim(),
          type: editType,
          status: editStatus,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update payment method")
        return
      }
      toast.success("Payment method updated")
      setEditOpen(false)
      setEditRow(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteRow) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/payment-methods/${deleteRow.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        toast.error("Failed to delete payment method")
        return
      }
      toast.success("Payment method deleted")
      setDeleteRow(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <TableSearchForm
            basePath="/payment-methods"
            defaultSearch={defaultSearch}
            placeholder="Search account name or number..."
          />
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add payment method
          </Button>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <EmptyState
              title="No payment methods"
              message="Add a payment channel (e.g. BPI, GCash) with account name and number."
              className="py-12"
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-1.5 text-left font-medium">
                        Account name
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Account number
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Type
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 py-1.5 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMethods.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-1.5 font-medium">
                          {row.accountName}
                        </td>
                        <td className="px-3 py-1.5">{row.accountNumber}</td>
                        <td className="px-3 py-1.5">{row.type}</td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="action"
                              size="icon-sm"
                              onClick={() => openEdit(row)}
                              title="Edit"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="action"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteRow(row)}
                              title="Delete"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex justify-end">
                <TablePagination totalItems={paymentMethods.length} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add modal */}
      <AlertDialog open={addOpen} onOpenChange={setAddOpen}>
        <AlertDialogContent size="xs">
          <AlertDialogHeader>
            <AlertDialogTitle>Add payment method</AlertDialogTitle>
            <AlertDialogDescription>
              Add a payment channel with account name, number, and type (e.g. BPI, GCash, Other). Status will be set to Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="add-accountName">Account name</Label>
              <Input
                id="add-accountName"
                value={addAccountName}
                onChange={(e) => setAddAccountName(e.target.value)}
                placeholder="e.g. MCFMP Coop BPI"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-accountNumber">Account number</Label>
              <Input
                id="add-accountNumber"
                value={addAccountNumber}
                onChange={(e) => setAddAccountNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="add-type">Type</Label>
              <Input
                id="add-type"
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                placeholder="e.g. BPI, GCash, Other"
                className="mt-1.5"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAddOpen(false)
                setAddAccountName("")
                setAddAccountNumber("")
                setAddType("")
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleAdd}
              disabled={
                saving ||
                !addAccountName.trim() ||
                !addAccountNumber.trim() ||
                !addType.trim()
              }
            >
              {saving ? "Adding…" : "Add"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit modal */}
      <AlertDialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false)
            setEditRow(null)
          }
        }}
      >
        <AlertDialogContent size="xs">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit payment method</AlertDialogTitle>
            <AlertDialogDescription>
              Update account name, number, type, or status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-accountName">Account name</Label>
              <Input
                id="edit-accountName"
                value={editAccountName}
                onChange={(e) => setEditAccountName(e.target.value)}
                placeholder="e.g. MCFMP Coop BPI"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-accountNumber">Account number</Label>
              <Input
                id="edit-accountNumber"
                value={editAccountNumber}
                onChange={(e) => setEditAccountNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Type</Label>
              <Input
                id="edit-type"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                placeholder="e.g. BPI, GCash, Other"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) =>
                  setEditStatus(v as "ACTIVE" | "INACTIVE")
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleEdit}
              disabled={
                saving ||
                !editAccountName.trim() ||
                !editAccountNumber.trim() ||
                !editType.trim()
              }
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deleteRow?.accountName}&quot; (
              {deleteRow?.accountNumber}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteRow(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
