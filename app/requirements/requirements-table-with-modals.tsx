"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ModuleHeader } from "@/components/module-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { UserPlus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"

type RequirementRow = {
  id: string
  name: string
  sortOrder: number
}

export function RequirementsTableWithModals({
  requirements,
  breadcrumb,
}: {
  requirements: RequirementRow[]
  breadcrumb: React.ReactNode
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editReq, setEditReq] = useState<RequirementRow | null>(null)
  const [deleteReq, setDeleteReq] = useState<RequirementRow | null>(null)
  const [addName, setAddName] = useState("")
  const [addSortOrder, setAddSortOrder] = useState(0)
  const [editName, setEditName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const paginatedRequirements = useMemo(() => {
    const start = (page - 1) * pageSize
    return requirements.slice(start, start + pageSize)
  }, [requirements, page, pageSize])

  function getNextSortOrder() {
    if (requirements.length === 0) return 0
    return Math.max(...requirements.map((r) => r.sortOrder), -1) + 1
  }

  async function handleAdd() {
    if (!addName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          sortOrder: addSortOrder,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to add requirement")
        return
      }
      toast.success("Requirement added")
      setAddOpen(false)
      setAddName("")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editReq || !editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/requirements/${editReq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? "Failed to update requirement")
        return
      }
      toast.success("Requirement updated")
      setEditOpen(false)
      setEditReq(null)
      setEditName("")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteReq) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/requirements/${deleteReq.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        toast.error("Failed to delete requirement")
        return
      }
      toast.success("Requirement deleted")
      setDeleteReq(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <ModuleHeader breadcrumb={breadcrumb} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Requirements</h1>
          <p className="text-sm text-muted-foreground">
            Manage document requirements. Assign them to loan types so members see only the required documents when applying.
          </p>
        </div>
      <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-end">
        <Button
          size="sm"
          onClick={() => {
            setAddSortOrder(getNextSortOrder())
            setAddOpen(true)
          }}
        >
          <UserPlus className="mr-2 size-4" />
          Add requirement
        </Button>
      </CardHeader>
      <CardContent>
        {requirements.length === 0 ? (
          <EmptyState
            message="No requirements yet. Add one to assign to loan types."
            className="py-12"
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">Name</th>
                    <th className="px-3 py-1.5 text-left font-medium">Order</th>
                    <th className="px-3 py-1.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequirements.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-3 py-1.5 font-medium">{r.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {r.sortOrder}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="action"
                            size="icon-sm"
                            onClick={() => {
                              setEditReq(r)
                              setEditName(r.name)
                              setEditOpen(true)
                            }}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="action"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteReq(r)}
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
              <TablePagination
                totalItems={requirements.length}
                page={page}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </div>
          </>
        )}
      </CardContent>
      </Card>
      </div>

      {/* Add modal */}
      <AlertDialog open={addOpen} onOpenChange={setAddOpen}>
        <AlertDialogContent size="default" className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Add requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Add a document type (e.g. Valid ID, Proof of income). You can then assign it to loan types.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="add-name">Name</Label>
            <Input
              id="add-name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Valid ID"
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Order will be set automatically (next: {addSortOrder}).
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAddOpen(false)
                setAddName("")
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleAdd} disabled={saving || !addName.trim()}>
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
            setEditReq(null)
            setEditName("")
          }
        }}
      >
        <AlertDialogContent size="default" className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Change the requirement name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Valid ID"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setEditOpen(false)
                setEditReq(null)
                setEditName("")
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleEdit}
              disabled={saving || !editName.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteReq}
        onOpenChange={(open) => !open && setDeleteReq(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deleteReq?.name}&quot;. It will no longer appear in loan type options. Existing assignments to loan types will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteReq(null)}>
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
