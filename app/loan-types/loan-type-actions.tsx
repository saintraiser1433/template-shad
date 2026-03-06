"use client"

import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function LoanTypeActions({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete() {
    const res = await fetch(`/api/loan-products/${id}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? "Failed to delete loan type")
      return
    }

    toast.success("Loan type deleted")
    router.refresh()
  }

  return (
    <div className="flex justify-end gap-1.5">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => router.push(`/loan-types/${id}`)}
        aria-label="Edit loan type"
      >
        <Pencil className="size-3.5" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Delete loan type"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete loan type?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove this loan
              type from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

