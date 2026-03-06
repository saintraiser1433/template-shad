"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MemberForm } from "./new/member-form"

export function NewMemberSheet() {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          New Member
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Register new member</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="mt-2 max-h-[70vh] overflow-y-auto pt-2">
          <MemberForm
            backHref="/members"
            onCancel={() => setOpen(false)}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

