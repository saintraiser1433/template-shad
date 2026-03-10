"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function CreateLoanFromApplication({
  applicationId,
}: {
  applicationId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleCreate() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/create-loan`,
        { method: "POST" }
      )
      const json = await res.json()
      if (!res.ok) {
        alert(json.error ?? "Failed to create loan")
        return
      }
      router.push(`/loans/${json.id}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="action"
        size="icon-sm"
        onClick={() => setOpen(true)}
        disabled={loading}
        title={loading ? "Creating…" : "Create loan"}
      >
        <Wallet className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Create loan from this application?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create a loan record and amortization schedule for this approved
            application. You cannot undo this action.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              {loading ? "Creating…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
