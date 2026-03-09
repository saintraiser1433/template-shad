"use client"

import { useState, useRef } from "react"
import { ClipboardEdit, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CIBIForm, type CIBIFormHandle } from "@/app/loans/[id]/cibi/cibi-form"

type CibiSheetProps = {
  applicationId: string
  applicationNo: string
  memberName: string
  memberNo: string
  currentStatus: string
  defaultValues: {
    characterNotes: string
    capacityNotes: string
    capitalNotes: string
    collateralNotes: string
    conditionsNotes: string
    cibiPassed: boolean
  }
}

export function CibiSheet({
  applicationId,
  applicationNo,
  memberName,
  memberNo,
  currentStatus,
  defaultValues,
}: CibiSheetProps) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<CIBIFormHandle | null>(null)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="action" size="icon-sm" title="Fill CI/BI">
          <ClipboardEdit className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        size="default"
        className="w-full max-w-8xl sm:max-w-[1400px] lg:max-w-[1600px]"
      >
        <div className="flex items-center justify-between gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>CI/BI — {applicationNo}</AlertDialogTitle>
          </AlertDialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-4 mb-2 max-h-[70vh] overflow-y-auto">
          <CIBIForm
            ref={formRef}
            applicationId={applicationId}
            applicationNo={applicationNo}
            memberName={memberName}
            memberNo={memberNo}
            currentStatus={currentStatus}
            defaultValues={defaultValues}
            hideActions
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            onClick={() => formRef.current?.saveDraft()}
          >
            Save draft
          </AlertDialogAction>
          <AlertDialogAction onClick={() => formRef.current?.submit()}>
            Submit to Manager
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

