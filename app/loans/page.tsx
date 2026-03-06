import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
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

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { search } = await searchParams
  const q = search?.trim()

  const loans = await prisma.loan.findMany({
    where: q
      ? {
          OR: [
            { loanNo: { contains: q, mode: "insensitive" } },
            { member: { name: { contains: q, mode: "insensitive" } } },
            { member: { memberNo: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, memberNo: true, name: true } },
    },
  })

  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex flex-1 items-center gap-2 px-4">
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
                <BreadcrumbPage>Loans</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Loans</h1>
          <p className="text-sm text-muted-foreground">
            Released loans with outstanding balance, status, and member.
          </p>
        </div>
        <Card>
          <CardHeader className="flex items-center justify-end space-y-0 pb-2">
            <TableSearchForm
              basePath="/loans"
              defaultSearch={search}
              placeholder="Search loan no or member..."
            />
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
                    <th className="px-3 py-1.5 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loans.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-10"
                      >
                        <EmptyState title={q ? "No loans found" : "No loans yet"} />
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => (
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
                          <Badge
                            variant={
                              loan.status === "ACTIVE"
                                ? "default"
                                : loan.status === "DELINQUENT"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {loan.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/loans/${loan.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-end">
              <TablePagination totalItems={loans.length} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
