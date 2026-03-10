import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TablePagination } from "@/components/ui/table-pagination"
import { TableSearchForm } from "@/components/table-search-form"
import { EmptyState } from "@/components/empty-state"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ApprovalApplicationActions } from "@/components/approval-application-actions"

const APPROVAL_STATUS_BY_ROLE: Record<string, string[]> = {
  MANAGER: ["MANAGER_REVIEW"],
  CREDIT_COMMITTEE: ["COMMITTEE_REVIEW"],
  BOARD_OF_DIRECTORS: ["BOARD_REVIEW"],
  ADMIN: ["MANAGER_REVIEW", "COMMITTEE_REVIEW", "BOARD_REVIEW"],
}

export default async function LoansForApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = session.user.role
  const allowedRoles = ["ADMIN", "MANAGER", "CREDIT_COMMITTEE", "BOARD_OF_DIRECTORS"]
  if (!role || !allowedRoles.includes(role)) redirect("/dashboard")

  const { search } = await searchParams
  const q = search?.trim()
  const statuses = APPROVAL_STATUS_BY_ROLE[role] ?? ["MANAGER_REVIEW", "COMMITTEE_REVIEW", "BOARD_REVIEW"]

  const applications = await prisma.loanApplication.findMany({
    where: {
      status: { in: statuses as ("MANAGER_REVIEW" | "COMMITTEE_REVIEW" | "BOARD_REVIEW")[] },
      ...(q
        ? {
            OR: [
              { applicationNo: { contains: q, mode: "insensitive" } },
              { member: { name: { contains: q, mode: "insensitive" } } },
              { member: { memberNo: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      member: true,
      cibiApprovedBy: { select: { name: true } },
      managerApprovedBy: { select: { name: true } },
      committeeBoardApprovedBy: { select: { name: true } },
      fundedBy: { select: { name: true } },
    },
  })

  return (
    <DashboardLayout>
      <ModuleHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/loans">Loans</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>For approval</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Applications for approval</h2>
              <p className="text-sm text-muted-foreground">
                Manager (up to ₱100k), Credit Committee, or Board of Directors.
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center justify-between gap-4">
              <TableSearchForm
                basePath="/loans/for-approval"
                defaultSearch={search}
                placeholder="Search application no or member..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">
                      Application No
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">Member</th>
                    <th className="px-3 py-1.5 text-left font-medium">Type</th>
                    <th className="px-3 py-1.5 text-left font-medium">Amount</th>
                    <th className="px-3 py-1.5 text-left font-medium">Status</th>
                    <th className="px-3 py-1.5 text-left font-medium">CI/BI who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Manager who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Committee/Board who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Finance Officer who approved</th>
                    <th className="px-3 py-1.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-3 py-10"
                      >
                        <EmptyState
                          title={
                            q
                              ? "No matching applications"
                              : "No applications in approval queue"
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-1.5 font-medium">
                          {app.applicationNo}
                        </td>
                        <td className="px-3 py-1.5">
                          {app.member.name} ({app.member.memberNo})
                        </td>
                        <td className="px-3 py-1.5">
                          {app.loanType.replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-1.5">
                          ₱{app.amount.toLocaleString("en-PH")}
                        </td>
                        <td className="px-3 py-1.5">
                          <Badge variant="secondary">{app.status}</Badge>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.cibiApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.managerApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.committeeBoardApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.fundedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <ApprovalApplicationActions
                            application={{
                              id: app.id,
                              amount: app.amount,
                              status: app.status,
                              characterNotes: app.characterNotes,
                              capacityNotes: app.capacityNotes,
                              capitalNotes: app.capitalNotes,
                              collateralNotes: app.collateralNotes,
                              conditionsNotes: app.conditionsNotes,
                              cibiPassed: app.cibiPassed,
                            }}
                            currentUserRole={role ?? undefined}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-end">
              <TablePagination totalItems={applications.length} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
