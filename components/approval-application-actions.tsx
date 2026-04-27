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

// ─── 5Cs read-only view (parses JSON stored by cibi-form) ────────────────────

function parseJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} }
}

function labelMap(map: Record<string, string>, value: unknown) {
  if (!value || typeof value !== "string") return "—"
  return map[value] ?? value
}

function NoteVal({ v }: { v: unknown }) {
  if (!v || (typeof v === "string" && !v.trim())) return <span className="text-muted-foreground">—</span>
  return <span>{String(v)}</span>
}

function CibiRow({ label, status, notes }: { label: string; status: React.ReactNode; notes?: unknown }) {
  return (
    <tr className="align-top border-b last:border-0">
      <td className="py-2 pr-3 text-xs text-muted-foreground w-[35%]">{label}</td>
      <td className="py-2 pr-3 text-xs w-[35%]">{status}</td>
      <td className="py-2 text-xs"><NoteVal v={notes} /></td>
    </tr>
  )
}

function CibiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="py-1.5 pl-3 pr-3 text-left font-medium w-[35%]">Item</th>
              <th className="py-1.5 pr-3 text-left font-medium w-[35%]">Finding</th>
              <th className="py-1.5 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y pl-3">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

const CB_LABELS: Record<string, string> = { SATISFACTORY: "Satisfactory", ADVERSE: "Adverse", NO_HISTORY: "No History" }
const PD_LABELS: Record<string, string> = { NONE: "None", RESOLVED: "Resolved", ACTIVE: "Active Case" }
const EM_LABELS: Record<string, string> = { GT_2_YEARS: "> 2 Years", "1_2_YEARS": "1-2 Years", LT_1_YEAR: "< 1 Year" }
const RISK3_LABELS: Record<string, string> = { HIGH: "High", MID: "Mid", LOW: "Low" }
const DS_LABELS: Record<string, string> = { MANAGEABLE: "Manageable", STRETCHED: "Stretched" }
const DTI_LABELS: Record<string, string> = { LT_35: "< 35%", "36_45": "36–45%", GT_45: "> 45%" }
const SAV_LABELS: Record<string, string> = { "3_6_MONTHS": "3–6 Months", LT_3_MONTHS: "< 3 Months", NONE: "None" }
const MKT_LABELS: Record<string, string> = { HIGH: "High", MODERATE: "Moderate", LOW: "Low" }
const OWN_LABELS: Record<string, string> = { VERIFIED: "Verified", PENDING: "Pending" }
const MS_LABELS: Record<string, string> = { GROWING: "Growing", STABLE: "Stable", DECLINING: "Declining" }
const IR_LABELS: Record<string, string> = { MINIMAL: "Minimal", MODERATE: "Moderate", HIGH: "High" }
const PA_LABELS: Record<string, string> = { APPROVE: "Approve", DECLINE: "Decline", CONDITIONAL: "Conditional Approval" }

function CibiNotesView({
  characterNotes,
  capacityNotes,
  capitalNotes,
  collateralNotes,
  conditionsNotes,
}: {
  characterNotes: string | null
  capacityNotes: string | null
  capitalNotes: string | null
  collateralNotes: string | null
  conditionsNotes: string | null
}) {
  const ch = parseJson(characterNotes)
  const ca = parseJson(capacityNotes)
  const cp = parseJson(capitalNotes)
  const co = parseJson(collateralNotes)
  const cn = parseJson(conditionsNotes)

  const assetTypes = [
    co.assetRealEstate ? "Real Estate" : null,
    co.assetVehicle ? "Vehicle" : null,
    co.assetEquipment ? "Equipment" : null,
  ].filter(Boolean).join(", ") || "—"

  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">5 Cs Evaluation</h3>

      <CibiSection title="1. Character">
        <CibiRow label="Credit Bureau Report Check" status={labelMap(CB_LABELS, ch.creditBureau)} notes={ch.creditBureauNotes} />
        <CibiRow label="Prior Loan Default / Arrears" status={labelMap(PD_LABELS, ch.priorDefault)} notes={ch.priorDefaultNotes} />
        <CibiRow label="Employment / Business Stability" status={labelMap(EM_LABELS, ch.employment)} notes={ch.employmentNotes} />
      </CibiSection>

      <CibiSection title="2. Capacity">
        <CibiRow label="Gross Monthly Income" status={<NoteVal v={ca.grossIncome} />} notes={labelMap(RISK3_LABELS, ca.grossIncomeRisk)} />
        <CibiRow label="Existing Monthly Debt Service" status={<NoteVal v={ca.debtService} />} notes={labelMap(DS_LABELS, ca.debtServiceRisk)} />
        <CibiRow label="Debt-to-Income (DTI) Ratio" status={ca.dtiRatio ? `${ca.dtiRatio}%` : "—"} notes={labelMap(DTI_LABELS, ca.dtiRisk)} />
      </CibiSection>

      <CibiSection title="3. Capital">
        <CibiRow label="Down Payment / Equity Contribution" status={cp.downPayment ? `${cp.downPayment}% of total cost` : "—"} notes={cp.downPaymentDetails} />
        <CibiRow label="Emergency Savings / Reserves" status={labelMap(SAV_LABELS, cp.emergencySavings)} notes={cp.emergencySavingsDetails} />
      </CibiSection>

      <CibiSection title="4. Collateral">
        <CibiRow label="Asset Type" status={assetTypes} notes={co.appraisedValue ? `Appraised: ${co.appraisedValue} — ${labelMap(MKT_LABELS, co.marketability)} marketability` : labelMap(MKT_LABELS, co.marketability)} />
        <CibiRow label="Ownership Verification" status={labelMap(OWN_LABELS, co.ownership)} notes={co.ownershipDetails} />
      </CibiSection>

      <CibiSection title="5. Conditions">
        <CibiRow label="Industry / Market Stability" status={labelMap(MS_LABELS, cn.marketStability)} notes={cn.marketStabilityNotes} />
        <CibiRow label="Interest Rate Fluctuations" status={labelMap(IR_LABELS, cn.interestRate)} notes={cn.interestRateNotes} />
      </CibiSection>

      {(cn.riskScore || cn.proposedAction || cn.conditionsForApproval) && (
        <div className="rounded-md border p-3 space-y-1 bg-muted/30">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Investigator Recommendation</p>
          {cn.riskScore && <p className="text-xs">Risk Score: <span className="font-medium">{String(cn.riskScore)} / 100</span></p>}
          {cn.proposedAction && <p className="text-xs">Proposed Action: <span className="font-medium">{labelMap(PA_LABELS, cn.proposedAction)}</span></p>}
          {cn.conditionsForApproval && (
            <p className="text-xs whitespace-pre-wrap">Conditions: {String(cn.conditionsForApproval)}</p>
          )}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

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
      window.dispatchEvent(new Event("activity-log-updated"))
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
              {/* CI/BI Summary */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h3>
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

              {/* 5 Cs structured view */}
              <CibiNotesView
                characterNotes={application.characterNotes}
                capacityNotes={application.capacityNotes}
                capitalNotes={application.capitalNotes}
                collateralNotes={application.collateralNotes}
                conditionsNotes={application.conditionsNotes}
              />

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
