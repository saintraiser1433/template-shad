import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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

export default async function LoansForFundingPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

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
    include: { member: true },
  })

  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
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
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Approved — for funding</CardTitle>
              <p className="text-sm text-muted-foreground">
                Treasurer funds approved loans. Create loan and schedule, then
                mark funded.
              </p>
            </div>
            <TableSearchForm
              basePath="/loans/for-funding"
              defaultSearch={search}
              placeholder="Search application no or member..."
            />
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
                    <th className="px-3 py-1.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
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
                        <td className="px-3 py-1.5 text-right flex gap-2 justify-end">
                          <CreateLoanFromApplication applicationId={app.id} />
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
      </div>
    </DashboardLayout>
  )
}
