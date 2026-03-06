import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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
import { LoanTypeActions } from "./loan-type-actions"

const PAGE_SIZE = 10

export default async function LoanTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.role === "MEMBER") {
    redirect("/dashboard")
  }

  const { search, page } = await searchParams
  const q = search?.trim() ?? ""
  const currentPage = Math.max(Number(page ?? "1") || 1, 1)

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { interestLabel: { contains: q, mode: "insensitive" } },
          { penaltyLabel: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined

  const [totalCount, products] = await Promise.all([
    prisma.loanProduct.count({ where }),
    prisma.loanProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

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
                <BreadcrumbPage>Loan types</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="px-4">
          <Button asChild size="sm">
            <Link href="/loan-types/new">Add loan type</Link>
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Type of loans</h1>
          <p className="text-sm text-muted-foreground">
            Loan product definitions: term, max amount, amortization, interest, and penalty.
          </p>
        </div>
        <Card>
          <CardHeader className="flex items-center justify-end space-y-0 pb-2">
            <TableSearchForm
              basePath="/loan-types"
              defaultSearch={q}
              placeholder="Search loan type..."
            />
          </CardHeader>
          <CardContent>
            {totalCount === 0 ? (
              <div className="py-10">
                <EmptyState
                  title="No loan types defined"
                  description="Add loan products such as Membership Loan, Micro Loan, and others."
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-1.5 text-left font-medium">
                          Loan type
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          Term
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          Max amount
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          Amortization
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          Interest
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          Penalty
                        </th>
                        <th className="px-3 py-1.5 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        let term = "-"
                        if (p.termMonthsMin && p.termMonthsMax) {
                          term =
                            p.termMonthsMin === p.termMonthsMax
                              ? `${p.termMonthsMin} month${
                                  p.termMonthsMin > 1 ? "s" : ""
                                }`
                              : `${p.termMonthsMin} to ${p.termMonthsMax} months`
                        } else if (p.termMonthsMin && !p.termMonthsMax) {
                          term = `${p.termMonthsMin}+ months`
                        } else if (p.termDaysMin && p.termDaysMax) {
                          term =
                            p.termDaysMin === p.termDaysMax
                              ? `${p.termDaysMin} days`
                              : `${p.termDaysMin} to ${p.termDaysMax} days`
                        }

                        let maxAmount = "-"
                        if (p.maxCbuPercent && !p.maxAmountFixed) {
                          maxAmount = `${p.maxCbuPercent}% of Capital Build Up`
                        } else if (p.maxAmountFixed) {
                          maxAmount = `₱${p.maxAmountFixed.toLocaleString(
                            "en-PH"
                          )}`
                        }

                        const interest = p.interestLabel
                        const penalty = p.penaltyLabel

                        return (
                          <tr
                            key={p.id}
                            className="border-b transition-colors hover:bg-muted/30"
                          >
                            <td className="px-3 py-1.5 font-medium">
                              {p.name}
                            </td>
                            <td className="px-3 py-1.5">{term}</td>
                            <td className="px-3 py-1.5">{maxAmount}</td>
                            <td className="px-3 py-1.5">{p.amortization}</td>
                            <td className="px-3 py-1.5">{interest}</td>
                            <td className="px-3 py-1.5">{penalty}</td>
                            <td className="px-3 py-1.5 text-right">
                              <LoanTypeActions id={p.id} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex justify-end">
                  <TablePagination
                    totalItems={totalCount}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

