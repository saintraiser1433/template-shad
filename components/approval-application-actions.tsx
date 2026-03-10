"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MANAGER_APPROVAL_LIMIT } from "@/lib/loan-config"
import { toast } from "sonner"
import type { ApplicationStatus } from "@prisma/client"
import type { Role } from "@prisma/client"

type ApplicationForApproval = {
  id: string
  amount: number
  status: string
  characterNotes: string | null
  capacityNotes: string | null
  capitalNotes: string | null
  collateralNotes: string | null
  conditionsNotes: string | null
  cibiPassed: boolean | null
}

export function ApprovalApplicationActions({
  application,
  currentUserRole,
}: {
  application: ApplicationForApproval
  currentUserRole: Role | undefined
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvalRemarks, setApprovalRemarks] = useState("")
  const [ciOpen, setCiOpen] = useState(false)
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [documents, setDocuments] = useState<
    { id: string; fileName: string; fileUrl: string; fileSize: number | null; mimeType: string | null; category: string }[]
  >([])

  async function setStatus(status: ApplicationStatus, extra?: { rejectionReason?: string; approvalRemarks?: string }) {
    setLoading(true)
    try {
      const body: { status: ApplicationStatus; rejectionReason?: string; approvalRemarks?: string } = { status }
      if (status === "REJECTED" && extra?.rejectionReason != null) body.rejectionReason = extra.rejectionReason
      if (extra?.approvalRemarks) body.approvalRemarks = extra.approvalRemarks
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? "Failed to update")
        return
      }
      toast.success("Status updated")
      setRejectOpen(false)
      setRejectionReason("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function getApproveStatus(): ApplicationStatus {
    const currentStatus = application.status as ApplicationStatus

    // Manager or Admin acting at manager stage
    if (currentStatus === "MANAGER_REVIEW") {
      if (currentUserRole === "MANAGER" || currentUserRole === "ADMIN") {
        if (application.amount > MANAGER_APPROVAL_LIMIT) {
          // High amount: endorse to Credit Committee
          return "COMMITTEE_REVIEW"
        }
        // Within manager limit: fully approve
        return "APPROVED"
      }
    }

    // Credit Committee (or Admin) acting at committee stage: endorse to Board
    if (currentStatus === "COMMITTEE_REVIEW") {
      if (currentUserRole === "CREDIT_COMMITTEE" || currentUserRole === "ADMIN") {
        return "BOARD_REVIEW"
      }
    }

    // Board (or Admin) acting at board stage: final approval
    if (currentStatus === "BOARD_REVIEW") {
      if (currentUserRole === "BOARD_OF_DIRECTORS" || currentUserRole === "ADMIN") {
        return "APPROVED"
      }
    }

    // Fallback: try to approve directly
    return "APPROVED"
  }

  const approveStatus = getApproveStatus()
  const isCommitteeOrBoard = currentUserRole === "CREDIT_COMMITTEE" || currentUserRole === "BOARD_OF_DIRECTORS"
  const approveButtonLabel =
    approveStatus === "APPROVED"
      ? "Approve"
      : approveStatus === "COMMITTEE_REVIEW"
        ? "Endorse to Committee"
        : approveStatus === "BOARD_REVIEW"
          ? "Endorse to Board"
          : "Update status"

  // Load CI/BI documents (photos, investigation) when the CI/BI dialog is first opened.
  useEffect(() => {
    if (!ciOpen || docsLoaded) return
    ;(async () => {
      try {
        const res = await fetch(`/api/documents?applicationId=${application.id}`)
        if (res.ok) {
          const data = await res.json()
          setDocuments(
            (data as any[]).map((d) => ({
              id: d.id,
              fileName: d.fileName,
              fileUrl: d.fileUrl,
              fileSize: d.fileSize ?? null,
              mimeType: d.mimeType ?? null,
              category: d.category ?? "REQUIREMENT",
            }))
          )
          setDocsLoaded(true)
        }
      } catch {
        // ignore fetch errors; CI/BI text still shows
      }
    })()
  }, [ciOpen, docsLoaded, application.id])

  function handleApproveClick() {
    if (isCommitteeOrBoard) {
      setApproveOpen(true)
    } else {
      setStatus(approveStatus)
    }
  }

  function submitApproveWithRemarks() {
    setStatus(approveStatus, { approvalRemarks })
    setApproveOpen(false)
    setApprovalRemarks("")
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <AlertDialog open={ciOpen} onOpenChange={setCiOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="action" size="icon-sm" title="View CI/BI">
              <ClipboardList className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>CI/BI Report — 5C&apos;s of Credit</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="mt-2 space-y-6 text-sm max-h-[70vh] overflow-y-auto">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Summary
                </h3>
                <p>
                  <span className="font-medium text-muted-foreground">CI/BI passed: </span>
                  {application.cibiPassed == null ? (
                    "—"
                  ) : application.cibiPassed ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="destructive">No</Badge>
                  )}
                </p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Character
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{application.characterNotes || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Capacity
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{application.capacityNotes || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Capital
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{application.capitalNotes || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Collateral
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{application.collateralNotes || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Conditions
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{application.conditionsNotes || "—"}</p>
                </div>
              </section>

              {documents.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Supporting documents
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Photos</p>
                      <ul className="mt-1 space-y-1">
                        {documents
                          .filter((d) => d.category === "PHOTO")
                          .map((d) => (
                            <li key={d.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">{d.fileName}</span>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                            </li>
                          ))}
                        {documents.filter((d) => d.category === "PHOTO").length === 0 && (
                          <li className="text-xs text-muted-foreground">No photos uploaded.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Investigation reports
                      </p>
                      <ul className="mt-1 space-y-1">
                        {documents
                          .filter((d) => d.category === "INVESTIGATION")
                          .map((d) => (
                            <li key={d.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">{d.fileName}</span>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                            </li>
                          ))}
                        {documents.filter((d) => d.category === "INVESTIGATION").length === 0 && (
                          <li className="text-xs text-muted-foreground">
                            No investigation documents uploaded.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Close</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApproveClick}
                disabled={loading}
              >
                {approveButtonLabel}
              </AlertDialogAction>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => setRejectOpen(true)}
                disabled={loading}
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve application</AlertDialogTitle>
            <AlertDialogDescription>
              Optionally add remarks for this approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="approvalRemarks">Remarks (optional)</Label>
            <Textarea
              id="approvalRemarks"
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="e.g. Approved after committee discussion..."
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApprovalRemarks("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitApproveWithRemarks} disabled={loading}>
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject application?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejection. The applicant will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Reason</Label>
            <Input
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Insufficient capacity..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                setStatus("REJECTED", { rejectionReason })
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
