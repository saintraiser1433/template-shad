import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { FileText } from "lucide-react"
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
import { AmortizationTable } from "@/components/amortization-table"
import { EmptyState } from "@/components/empty-state"
import { RecordPaymentButton } from "./record-payment-button"

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: true,
      application: { include: { loanProduct: true } },
      voucher: true,
      amortizationSchedule: { orderBy: { sequence: "asc" } },
      payments: { orderBy: { paymentDate: "desc" }, take: 20 },
    },
  })

  if (!loan) notFound()

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
                <BreadcrumbPage>{loan.loanNo}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Loan details</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
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
              {(loan.status === "ACTIVE" || loan.status === "DELINQUENT") && (
                <RecordPaymentButton loanId={loan.id} />
              )}
              {loan.voucher ? (
                <Button variant="action" size="icon-sm" asChild title="View voucher">
                  <Link href={`/loans/${loan.id}/voucher`}>
                    <FileText className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="action" size="icon-sm" asChild title="Create voucher">
                  <Link href={`/loans/${loan.id}/voucher`}>
                    <FileText className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Loan number
                </p>
                <p className="font-medium">{loan.loanNo}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Member
                </p>
                <p className="font-medium">
                  <Link
                    href={`/members/${loan.memberId}`}
                    className="underline hover:no-underline"
                  >
                    {loan.member.name} ({loan.member.memberNo})
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Member CBU
                </p>
                <p className="font-medium">
                  ₱{loan.member.cbu.toLocaleString("en-PH")}
                </p>
              </div>
              {loan.application?.loanProduct?.maxCbuPercent != null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    CBU requirement (% of loan)
                  </p>
                  <p className="font-medium">
                    {loan.application.loanProduct.maxCbuPercent}%
                  </p>
                </div>
              )}
              {loan.application?.loanProduct?.maxCbuPercent != null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Required CBU
                  </p>
                  <p className="font-medium">
                    ₱
                    {(
                      loan.principalAmount *
                      (loan.application.loanProduct.maxCbuPercent / 100)
                    ).toLocaleString("en-PH")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="font-medium">
                  {loan.loanType.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Principal
                </p>
                <p className="font-medium">
                  ₱{loan.principalAmount.toLocaleString("en-PH")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Outstanding balance
                </p>
                <p className="font-medium">
                  ₱{loan.outstandingBalance.toLocaleString("en-PH")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Interest rate
                </p>
                <p className="font-medium">
                  {(loan.interestRate * 100).toFixed(2)}% per period
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loan.amortizationSchedule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Amortization schedule</CardTitle>
              <p className="text-sm text-muted-foreground">
                Installment breakdown by due date, principal, interest, and penalty.
              </p>
            </CardHeader>
            <CardContent>
              <AmortizationTable schedule={loan.amortizationSchedule} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <p className="text-sm text-muted-foreground">
              Payments applied to this loan (principal, interest, penalty).
            </p>
          </CardHeader>
          <CardContent>
            {loan.payments.length === 0 ? (
              <div className="py-10">
                <EmptyState title="No payments yet" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-1.5 text-left font-medium">Date</th>
                      <th className="px-3 py-1.5 text-left font-medium">Amount</th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Principal
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Interest
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Penalty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-1.5">
                          {new Date(p.paymentDate).toLocaleDateString("en-PH")}
                        </td>
                        <td className="px-3 py-1.5">
                          ₱{p.amount.toLocaleString("en-PH")}
                        </td>
                        <td className="px-3 py-1.5">
                          ₱{p.principal.toLocaleString("en-PH")}
                        </td>
                        <td className="px-3 py-1.5">
                          ₱{p.interest.toLocaleString("en-PH")}
                        </td>
                        <td className="px-3 py-1.5">
                          ₱{p.penalty.toLocaleString("en-PH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
