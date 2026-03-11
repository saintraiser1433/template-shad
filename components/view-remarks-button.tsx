"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
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

type ViewRemarksButtonProps = {
  applicationNo: string
  remarks: string | null
  /** Optional label, default "View remarks" */
  label?: string
  /** Show as icon-only button */
  variant?: "default" | "ghost"
  size?: "sm" | "icon-sm" | "default"
}

export function ViewRemarksButton({
  applicationNo,
  remarks,
  label = "View remarks",
  variant = "default",
  size = "sm",
}: ViewRemarksButtonProps) {
  const [open, setOpen] = useState(false)
  const hasRemarks = remarks != null && remarks.trim() !== ""

  if (!hasRemarks) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  return (
    <>
      <Button
        type="button"
        variant={variant === "ghost" ? "ghost" : "outline"}
        size={size}
        className="gap-1"
        onClick={() => setOpen(true)}
        title={label}
      >
        <MessageSquare className="size-3.5" />
        {size !== "icon-sm" && label}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approval remarks</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground text-xs">
            Application {applicationNo}
          </p>
          <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
            {remarks}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => setOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
