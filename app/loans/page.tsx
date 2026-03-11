import { redirect } from "next/navigation"
import Link from "next/link"
import { Eye } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { TableSearchForm } from "@/components/table-search-form"
import { EmptyState } from "@/components/empty-state"
import { MemberApplicationsTable } from "./member-applications-table"
import { LoansPagination } from "./loans-pagination"
import { StatusTabs } from "./status-tabs"
import { ApplicationStatusTabs } from "./application-status-tabs"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const LOAN_STATUSES = ["ACTIVE", "PAID", "DELINQUENT", "RENEWED"] as const
const APPLICATION_STATUSES = [
  "PENDING", "CIBI_REVIEW", "MANAGER_REVIEW", "COMMITTEE_REVIEW",
  "BOARD_REVIEW", "APPROVED", "REJECTED", "FUNDED", "RELEASED",
] as const
const PAGE_SIZES = [10, 25, 50]
const DEFAULT_PAGE_SIZE = 10

function clampPageSize(size: number): number {
  const n = Number(size) || DEFAULT_PAGE_SIZE
  return PAGE_SIZES.includes(n) ? n : DEFAULT_PAGE_SIZE
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string; size?: string; appPage?: string; appSize?: string; appStatus?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const params = await searchParams
  const q = params.search?.trim()
  const statusFilter = params.status?.toUpperCase()
  const validStatus = statusFilter && LOAN_STATUSES.includes(statusFilter as (typeof LOAN_STATUSES)[number]) ? statusFilter : null
  const page = Math.max(1, Number(params.page) || 1)
  const size = clampPageSize(Number(params.size) || DEFAULT_PAGE_SIZE)
  const appPage = Math.max(1, Number(params.appPage) || 1)
  const appSize = clampPageSize(Number(params.appSize) || DEFAULT_PAGE_SIZE)
  const appStatusParam = params.appStatus?.toUpperCase()
  const validAppStatus =
    appStatusParam && APPLICATION_STATUSES.includes(appStatusParam as (typeof APPLICATION_STATUSES)[number])
      ? appStatusParam
      : null
  const isMember = session.user.role === "MEMBER"

  let memberIdFilter: string | undefined
  if (isMember) {
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (member) memberIdFilter = member.id
  }

  const loansWhere = {
    ...(memberIdFilter ? { memberId: memberIdFilter } : {}),
    ...(validStatus ? { status: validStatus } : {}),
    ...(q
      ? {
          OR: [
            { loanNo: { contains: q, mode: "insensitive" } },
            { member: { name: { contains: q, mode: "insensitive" } } },
            { member: { memberNo: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  const [loansTotal, loans] = await Promise.all([
    prisma.loan.count({ where: loansWhere }),
    prisma.loan.findMany({
      where: loansWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
      include: {
        member: { select: { id: true, memberNo: true, name: true } },
        application: {
          select: {
            cibiApprovedBy: { select: { name: true } },
            managerApprovedBy: { select: { name: true } },
            committeeApprovedBy: { select: { name: true } },
            boardApprovedBy: { select: { name: true } },
            fundedBy: { select: { name: true } },
          },
        },
        amortizationSchedule: {
          select: { isPaid: true },
        },
      },
    }),
  ])

  const applicationsWhere = {
    memberId: memberIdFilter!,
    ...(validAppStatus ? { status: validAppStatus } : {}),
  }
  const [applicationsTotal, applications] = memberIdFilter
    ? await Promise.all([
        prisma.loanApplication.count({ where: applicationsWhere }),
        prisma.loanApplication.findMany({
          where: applicationsWhere,
          orderBy: { createdAt: "desc" },
          skip: (appPage - 1) * appSize,
          take: appSize,
          include: {
            loanProduct: { select: { name: true } },
            cibiApprovedBy: { select: { name: true } },
            managerApprovedBy: { select: { name: true } },
            committeeApprovedBy: { select: { name: true } },
            boardApprovedBy: { select: { name: true } },
            fundedBy: { select: { name: true } },
          },
        }),
      ])
    : [0, []]

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
                <BreadcrumbPage>Loans</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Loans</h1>
          <p className="text-sm text-muted-foreground">
            Released loans with outstanding balance, status, and member.
          </p>
        </div>
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-row flex-wrap items-center justify-between gap-4">
              <TableSearchForm
                basePath="/loans"
                defaultSearch={params.search}
                placeholder="Search loan no or member..."
              />
            </div>
            <div className="flex flex-wrap gap-1 border-b border-border">
              <StatusTabs current={validStatus} search={params.search} size={size} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">Loan No</th>
                    <th className="px-3 py-1.5 text-left font-medium">Member</th>
                    <th className="px-3 py-1.5 text-left font-medium">Type</th>
                    <th className="px-3 py-1.5 text-left font-medium">Principal</th>
                    <th className="px-3 py-1.5 text-left font-medium">
                      Outstanding
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">Status</th>
                    <th className="px-3 py-1.5 text-left font-medium">CI/BI who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Manager who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Committee who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Board who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Finance Officer who approved</th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loans.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-3 py-10"
                      >
                        <EmptyState title={q ? "No loans found" : "No loans yet"} />
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => {
                      const isLoanFullyPaid =
                        loan.outstandingBalance < 0.01 &&
                        loan.amortizationSchedule.length > 0 &&
                        loan.amortizationSchedule.every((row) => row.isPaid)
                      const displayStatus =
                        isLoanFullyPaid && loan.status !== "PAID" ? "PAID" : loan.status
                      return (
                        <tr
                          key={loan.id}
                          className="border-b transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-1.5 font-medium">{loan.loanNo}</td>
                          <td className="px-3 py-1.5">
                            {loan.member.name} ({loan.member.memberNo})
                          </td>
                          <td className="px-3 py-1.5">
                            {loan.loanType.replace(/_/g, " ")}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{loan.principalAmount.toLocaleString("en-PH")}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{loan.outstandingBalance.toLocaleString("en-PH")}
                          </td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={displayStatus} />
                        </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {loan.application?.cibiApprovedBy?.name ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {loan.application?.managerApprovedBy?.name ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {loan.application?.committeeApprovedBy?.name ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {loan.application?.boardApprovedBy?.name ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {loan.application?.fundedBy?.name ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Button variant="action" size="icon-sm" asChild title="View">
                              <Link href={`/loans/${loan.id}`}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-end">
              <LoansPagination totalItems={loansTotal} />
            </div>
          </CardContent>
        </Card>

        {memberIdFilter && (
          <Card>
            <CardHeader className="flex flex-col gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Loan applications</h2>
                <p className="text-xs text-muted-foreground">
                  Your submitted loan requests and their approval status.
                </p>
              </div>
              <ApplicationStatusTabs current={validAppStatus} />
            </CardHeader>
            <CardContent>
              <MemberApplicationsTable
                rows={applications.map((app) => ({
                  id: app.id,
                  applicationNo: app.applicationNo,
                  typeLabel: app.loanProduct?.name ?? app.loanType.replace(/_/g, " "),
                  amount: app.amount,
                  status: app.status,
                  rejectionReason: app.rejectionReason ?? null,
                  approvalRemarks: app.approvalRemarks ?? null,
                  cibiApprovedByName: app.cibiApprovedBy?.name ?? null,
                  managerApprovedByName: app.managerApprovedBy?.name ?? null,
                  committeeApprovedByName: app.committeeApprovedBy?.name ?? null,
                  boardApprovedByName: app.boardApprovedBy?.name ?? null,
                  fundedByName: app.fundedBy?.name ?? null,
                }))}
              />
              <div className="mt-2 flex justify-end">
                <LoansPagination
                  totalItems={applicationsTotal}
                  pageParam="appPage"
                  sizeParam="appSize"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
