import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { CreateLoanFromApplication } from "@/components/create-loan-from-application"
import { UpdateApplicationStatus } from "@/components/update-application-status"
import { ViewRemarksButton } from "@/components/view-remarks-button"
import { RoleActionHistoryTable } from "../role-action-history-table"

export default async function LoansForFundingPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = session.user.role
  const allowedRoles = ["ADMIN", "TREASURER", "LOANS_CLERK", "DISBURSING_STAFF", "CASHIER"]
  if (!role || !allowedRoles.includes(role)) redirect("/dashboard")

  const { search } = await searchParams
  const q = search?.trim()

  const applications = await prisma.loanApplication.findMany({
    where: {
      status: "APPROVED",
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
      committeeApprovedBy: { select: { name: true } },
      boardApprovedBy: { select: { name: true } },
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
                <BreadcrumbPage>For funding</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Approved — for funding</h2>
              <p className="text-sm text-muted-foreground">
                Treasurer funds approved loans. Create loan and schedule, then
                mark funded.
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center justify-between gap-4">
              <TableSearchForm
                basePath="/loans/for-funding"
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
                              : "No approved applications awaiting funding"
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
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.cibiApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.managerApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.committeeApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.boardApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {app.fundedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          <ViewRemarksButton
                            applicationNo={app.applicationNo}
                            remarks={app.approvalRemarks}
                            label="View"
                            size="sm"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right flex gap-2 justify-end">
                          <CreateLoanFromApplication
                            applicationId={app.id}
                            applicationNo={app.applicationNo}
                            memberName={app.member.name}
                          />
                          <UpdateApplicationStatus
                            applicationId={app.id}
                            currentStatus={app.status}
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

        <RoleActionHistoryTable historyType="finance" />
      </div>
    </DashboardLayout>
  )
}
