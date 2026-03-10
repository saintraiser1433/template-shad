import { redirect } from "next/navigation"
import Link from "next/link"
import { Eye } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { TablePagination } from "@/components/ui/table-pagination"
import { TableSearchForm } from "@/components/table-search-form"
import { EmptyState } from "@/components/empty-state"
import { ReportExportForm } from "./report-export-form"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { search } = await searchParams
  const q = search?.trim()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const [
    outstandingLoans,
    totalOutstanding,
    delinquentLoans,
    todayCollections,
    totalCbu,
    memberCount,
  ] = await Promise.all([
    prisma.loan.findMany({
      where: {
        status: { in: ["ACTIVE", "DELINQUENT"] },
        ...(q
          ? {
              OR: [
                { loanNo: { contains: q, mode: "insensitive" } },
                { member: { name: { contains: q, mode: "insensitive" } } },
                { member: { memberNo: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        member: { select: { memberNo: true, name: true } },
        application: {
          select: {
            cibiApprovedBy: { select: { name: true } },
            managerApprovedBy: { select: { name: true } },
            committeeBoardApprovedBy: { select: { name: true } },
            fundedBy: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.aggregate({
      where: {
        status: { in: ["ACTIVE", "DELINQUENT"] },
        ...(q
          ? {
              OR: [
                { loanNo: { contains: q, mode: "insensitive" } },
                { member: { name: { contains: q, mode: "insensitive" } } },
                { member: { memberNo: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      _sum: { outstandingBalance: true },
    }),
    prisma.loan.findMany({
      where: {
        status: "DELINQUENT",
        ...(q
          ? {
              OR: [
                { loanNo: { contains: q, mode: "insensitive" } },
                { member: { name: { contains: q, mode: "insensitive" } } },
                { member: { memberNo: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        member: { select: { memberNo: true, name: true } },
        application: {
          select: {
            cibiApprovedBy: { select: { name: true } },
            managerApprovedBy: { select: { name: true } },
            committeeBoardApprovedBy: { select: { name: true } },
            fundedBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.payment.aggregate({
      where: { paymentDate: { gte: todayStart, lt: tomorrowStart } },
      _sum: { amount: true },
    }),
    prisma.member.aggregate({ _sum: { cbu: true } }),
    prisma.member.count(),
  ])

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
                <BreadcrumbPage>Reports</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio overview: outstanding balances, collections, delinquency, and member CBU.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Generate report</CardTitle>
            <p className="text-sm text-muted-foreground">
              Export loans, collections, or members list as Excel or PDF.
            </p>
          </CardHeader>
          <CardContent>
            <ReportExportForm />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ₱{(totalOutstanding._sum.outstandingBalance ?? 0).toLocaleString("en-PH")}
              </p>
              <p className="text-xs text-muted-foreground">
                {outstandingLoans.length} active/delinquent loans
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Today&apos;s collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ₱{(todayCollections._sum.amount ?? 0).toLocaleString("en-PH")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Delinquent accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{delinquentLoans.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total CBU (members)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ₱{(totalCbu._sum.cbu ?? 0).toLocaleString("en-PH")}
              </p>
              <p className="text-xs text-muted-foreground">
                {memberCount} members
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div>
              <CardTitle>Outstanding loans</CardTitle>
              <p className="text-sm text-muted-foreground">
                Active and delinquent loans with current outstanding balance.
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center justify-between gap-4">
              <TableSearchForm
                basePath="/reports"
                defaultSearch={search}
                placeholder="Search loan no or member..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">Loan No</th>
                    <th className="px-3 py-1.5 text-left font-medium">Member</th>
                    <th className="px-3 py-1.5 text-left font-medium">CI/BI who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Manager who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Committee/Board who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Finance Officer who approved</th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      Outstanding
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingLoans.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-10"
                      >
                        <EmptyState title="No outstanding loans" />
                      </td>
                    </tr>
                  ) : (
                    outstandingLoans.map((loan) => (
                      <tr
                        key={loan.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-1.5 font-medium">{loan.loanNo}</td>
                        <td className="px-3 py-1.5">
                          {loan.member.name} ({loan.member.memberNo})
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.cibiApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.managerApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.committeeBoardApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.fundedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          ₱{loan.outstandingBalance.toLocaleString("en-PH")}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Button variant="action" size="icon-sm" asChild title="View">
                            <Link href={`/loans/${loan.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-end">
              <TablePagination totalItems={outstandingLoans.length} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div>
              <CardTitle>Delinquent accounts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Loans past due; require follow-up and collection.
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center justify-between gap-4">
              <TableSearchForm
                basePath="/reports"
                defaultSearch={search}
                placeholder="Search loan no or member..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">Loan No</th>
                    <th className="px-3 py-1.5 text-left font-medium">Member</th>
                    <th className="px-3 py-1.5 text-left font-medium">CI/BI who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Manager who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Committee/Board who approved</th>
                    <th className="px-3 py-1.5 text-left font-medium">Finance Officer who approved</th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      Outstanding
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {delinquentLoans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10">
                        <EmptyState title="No delinquent accounts" />
                      </td>
                    </tr>
                  ) : (
                    delinquentLoans.map((loan) => (
                      <tr
                        key={loan.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-1.5 font-medium">{loan.loanNo}</td>
                        <td className="px-3 py-1.5">
                          {loan.member.name} ({loan.member.memberNo})
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.cibiApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.managerApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.committeeBoardApprovedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {loan.application?.fundedBy?.name ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          ₱{loan.outstandingBalance.toLocaleString("en-PH")}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Button variant="action" size="icon-sm" asChild title="View">
                            <Link href={`/loans/${loan.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {delinquentLoans.length > 0 ? (
              <div className="mt-2 flex justify-end">
                <TablePagination totalItems={delinquentLoans.length} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
