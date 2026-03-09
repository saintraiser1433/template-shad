import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Eye } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { TableSearchForm } from "@/components/table-search-form"
import { EmptyState } from "@/components/empty-state"

const GOOD_STANDING_CBU = 20_000

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const { search } = await searchParams
  const q = search?.trim()

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      loans: {
        where: q
          ? {
              OR: [
                { loanNo: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        include: { amortizationSchedule: { orderBy: { sequence: "asc" } } },
      },
    },
  })

  if (!member) notFound()

  const goodStanding = member.isRegularMember && member.cbu >= GOOD_STANDING_CBU

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
                <BreadcrumbLink href="/members">Members</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{member.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Member profile</CardTitle>
            <Badge variant={goodStanding ? "default" : "secondary"}>
              {goodStanding ? "Good standing" : "Not eligible for loans"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Member number
                </p>
                <p className="font-medium">{member.memberNo}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{member.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Capital Build Up (CBU)
                </p>
                <p className="font-medium">
                  ₱{member.cbu.toLocaleString("en-PH")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Regular member
                </p>
                <p className="font-medium">
                  {member.isRegularMember ? "Yes" : "No"}
                </p>
              </div>
              {member.address && (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Address
                  </p>
                  <p className="font-medium">{member.address}</p>
                </div>
              )}
              {member.contactNo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Contact
                  </p>
                  <p className="font-medium">{member.contactNo}</p>
                </div>
              )}
              {member.occupation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Occupation
                  </p>
                  <p className="font-medium">{member.occupation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div>
              <CardTitle>Loans</CardTitle>
              <p className="text-sm text-muted-foreground">
                Loans under this member with principal, outstanding, and status.
              </p>
            </div>
            <div className="flex flex-row flex-wrap items-center justify-between gap-4">
              <TableSearchForm
                basePath={`/members/${member.id}`}
                defaultSearch={search}
                placeholder="Search loan no..."
              />
              {goodStanding && (
                <Button size="sm" asChild>
                  <Link href={`/loans/apply?memberId=${member.id}`}>
                    Apply for loan
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {member.loans.length === 0 ? (
              <div className="py-10">
                <EmptyState title={q ? "No loans found" : "No loans yet"} />
              </div>
            ) : (
              <div className="space-y-2">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-1.5 text-left font-medium">
                        Loan No
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">Type</th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Principal
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Outstanding
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 py-1.5 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.loans.map((loan) => (
                      <tr
                        key={loan.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-1.5 font-medium">{loan.loanNo}</td>
                        <td className="px-3 py-1.5">{loan.loanType.replace(/_/g, " ")}</td>
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
                          <Button variant="action" size="icon-sm" asChild title="View">
                            <Link href={`/loans/${loan.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
