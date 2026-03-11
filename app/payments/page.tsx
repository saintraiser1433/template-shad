import { redirect } from "next/navigation"
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
import { RecordPaymentForm } from "./record-payment-form"
import { formatDate } from "@/lib/date-format"

export default async function PaymentsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const [activeLoans, todayPayments, todayTotal] = await Promise.all([
    prisma.loan.findMany({
      where: { status: { in: ["ACTIVE", "DELINQUENT"] } },
      include: { member: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: {
        paymentDate: { gte: todayStart, lt: tomorrowStart },
      },
      include: { loan: { select: { loanNo: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { amount: true },
    }),
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
                <BreadcrumbPage>Payments</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Record payment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a loan and enter amount. Principal, interest, and
                penalty are applied automatically.
              </p>
            </CardHeader>
            <CardContent>
              <RecordPaymentForm
                loans={activeLoans.map((l) => ({
                  id: l.id,
                  loanNo: l.loanNo,
                  memberName: l.member.name,
                  outstandingBalance: l.outstandingBalance,
                }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s collections</CardTitle>
              <p className="text-2xl font-bold">
                ₱{(todayTotal._sum.amount ?? 0).toLocaleString("en-PH")}
              </p>
            </CardHeader>
            <CardContent>
              {todayPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payments recorded today.
                </p>
              ) : (
                <div className="space-y-2">
                  {todayPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between rounded border px-3 py-2 text-sm"
                    >
                      <span>
                        {p.loan.loanNo} — ₱
                        {p.amount.toLocaleString("en-PH")}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(p.paymentDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
