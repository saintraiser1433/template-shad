"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { ViewRemarksButton } from "@/components/view-remarks-button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type MemberApplicationRow = {
  id: string
  applicationNo: string
  typeLabel: string
  amount: number
  status: string
  rejectionReason: string | null
  approvalRemarks: string | null
  cibiApprovedByName?: string | null
  managerApprovedByName?: string | null
  committeeApprovedByName?: string | null
  boardApprovedByName?: string | null
  fundedByName?: string | null
}

export function MemberApplicationsTable({ rows }: { rows: MemberApplicationRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = rows.find((r) => r.id === openId) ?? null

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-1.5 text-left font-medium">Application No</th>
              <th className="px-3 py-1.5 text-left font-medium">Type</th>
              <th className="px-3 py-1.5 text-left font-medium">Amount</th>
              <th className="px-3 py-1.5 text-left font-medium">Status</th>
              <th className="px-3 py-1.5 text-left font-medium">CI/BI who approved</th>
              <th className="px-3 py-1.5 text-left font-medium">Manager who approved</th>
              <th className="px-3 py-1.5 text-left font-medium">Committee who approved</th>
              <th className="px-3 py-1.5 text-left font-medium">Board who approved</th>
              <th className="px-3 py-1.5 text-left font-medium">Finance Officer who approved</th>
              <th className="px-3 py-1.5 text-left font-medium">Remarks</th>
              <th className="px-3 py-1.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-10"
                >
                  <span className="text-xs text-muted-foreground">No loan applications yet.</span>
                </td>
              </tr>
            ) : (
              rows.map((app) => (
                <tr
                  key={app.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="px-3 py-1.5 font-medium">{app.applicationNo}</td>
                  <td className="px-3 py-1.5">{app.typeLabel}</td>
                  <td className="px-3 py-1.5">₱{app.amount.toLocaleString("en-PH")}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{app.cibiApprovedByName ?? "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{app.managerApprovedByName ?? "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{app.committeeApprovedByName ?? "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{app.boardApprovedByName ?? "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{app.fundedByName ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <ViewRemarksButton
                      applicationNo={app.applicationNo}
                      remarks={app.approvalRemarks}
                      label="View"
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {app.status === "REJECTED" && app.rejectionReason ? (
                      <Button
                        type="button"
                        variant="action"
                        size="icon-sm"
                        title="View rejection reason"
                        onClick={() => setOpenId(app.id)}
                      >
                        <Info className="size-4" />
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!selected} onOpenChange={(open) => !open && setOpenId(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Rejection reason</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="mt-1 text-xs text-muted-foreground">
            Application {selected?.applicationNo}
          </p>
          <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
            {selected?.rejectionReason}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => setOpenId(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

