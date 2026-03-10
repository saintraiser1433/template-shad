import { redirect } from "next/navigation"
import Link from "next/link"
import { ClipboardEdit } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Button } from "@/components/ui/button"
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
import { UpdateApplicationStatus } from "@/components/update-application-status"
import { CibiSheet } from "./cibi-sheet"

export default async function LoansPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = session.user.role
  const allowedRoles = ["ADMIN", "MANAGER", "COLLECTOR"]
  if (!role || !allowedRoles.includes(role)) redirect("/dashboard")

  const { search } = await searchParams
  const q = search?.trim()

  const applications = await prisma.loanApplication.findMany({
    where: {
      status: { in: ["PENDING", "CIBI_REVIEW"] },
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
                <BreadcrumbPage>Pending CI/BI</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Pending applications (CI/BI queue)</h2>
              <p className="text-sm text-muted-foreground">
                Manager and Collector conduct CI/BI using 5C&apos;s of credit.
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center justify-between gap-4">
              <TableSearchForm
                basePath="/loans/pending"
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
                            q ? "No matching applications" : "No pending applications"
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
                          <div className="flex items-center justify-end gap-1">
                            <CibiSheet
                              applicationId={app.id}
                              applicationNo={app.applicationNo}
                              memberName={app.member.name}
                              memberNo={app.member.memberNo}
                              currentStatus={app.status}
                              defaultValues={{
                                characterNotes: app.characterNotes ?? "",
                                capacityNotes: app.capacityNotes ?? "",
                                capitalNotes: app.capitalNotes ?? "",
                                collateralNotes: app.collateralNotes ?? "",
                                conditionsNotes: app.conditionsNotes ?? "",
                                cibiPassed: app.cibiPassed ?? false,
                              }}
                            />
                            <UpdateApplicationStatus
                              applicationId={app.id}
                              currentStatus={app.status}
                              role={role}
                            />
                          </div>
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
