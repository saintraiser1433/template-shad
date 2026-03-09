import { redirect } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Users, Wallet, AlertCircle, Banknote } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const [
    totalMembers,
    activeLoans,
    delinquentLoans,
    todayPayments,
    todaySum,
    loanStatusGroups,
    loanTypeGroups,
    recentPayments,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.count({ where: { status: "DELINQUENT" } }),
    prisma.payment.count({
      where: {
        paymentDate: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { amount: true },
    }),
    prisma.loan.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.loan.groupBy({
      by: ["loanType"],
      _count: { _all: true },
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: sevenDaysAgo, lt: tomorrowStart } },
      select: { paymentDate: true, amount: true },
      orderBy: { paymentDate: "asc" },
    }),
  ])

  const loanStatusData = ["ACTIVE", "PAID", "DELINQUENT", "RENEWED"].map(
    (status) => ({
      label: status,
      value:
        loanStatusGroups.find((g) => g.status === status)?._count._all ?? 0,
    })
  )

  const loanTypeData = [
    "MEMBERSHIP_LOAN",
    "MICRO_LOAN",
    "REGULAR_LOAN",
    "PRODUCTION_LOAN",
    "SHORT_TERM_LOAN",
    "LONG_TERM_LOAN",
    "EDUCATIONAL_LOAN",
  ].map((type) => ({
    label: type.replace(/_/g, " "),
    value:
      loanTypeGroups.find((g) => g.loanType === type as any)?._count._all ?? 0,
  }))

  const dailyCollectionsMap = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(sevenDaysAgo.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    dailyCollectionsMap.set(key, 0)
  }
  for (const p of recentPayments) {
    const key = p.paymentDate.toISOString().slice(0, 10)
    if (dailyCollectionsMap.has(key)) {
      dailyCollectionsMap.set(
        key,
        (dailyCollectionsMap.get(key) ?? 0) + p.amount
      )
    }
  }
  const dailyCollectionsData = Array.from(dailyCollectionsMap.entries()).map(
    ([date, amount]) => ({
      label: new Date(date).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      }),
      value: amount,
    })
  )

  return (
    <DashboardLayout>
      <ModuleHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Members
                </CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMembers}</div>
                <p className="text-xs text-muted-foreground">
                  <Link href="/members" className="underline hover:no-underline">
                    View members
                  </Link>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Loans
                </CardTitle>
                <Wallet className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeLoans}</div>
                <p className="text-xs text-muted-foreground">
                  <Link href="/loans" className="underline hover:no-underline">
                    View loans
                  </Link>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Collections
                </CardTitle>
                <Banknote className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{(todaySum._sum.amount ?? 0).toLocaleString("en-PH")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {todayPayments} payment(s) today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Delinquent Loans
                </CardTitle>
                <AlertCircle className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{delinquentLoans}</div>
                <p className="text-xs text-muted-foreground">
                  Require follow-up
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Collections (last 7 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={dailyCollectionsData} format="currency" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Loans by status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={loanStatusData} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Loans by type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={loanTypeData} />
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  )
}

function MiniBarChart({
  data,
  format,
}: {
  data: { label: string; value: number }[]
  format?: "currency"
}) {
  const max = Math.max(...data.map((d) => d.value), 0) || 1

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => {
        const height = (d.value / max) * 100
        const displayValue =
          format === "currency"
            ? `₱${d.value.toLocaleString("en-PH")}`
            : d.value.toLocaleString("en-PH")

        return (
          <div
            key={d.label}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div className="flex w-full items-end justify-center rounded-t bg-primary/80">
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-foreground">
              {displayValue}
            </span>
            <span className="text-[10px] text-muted-foreground text-center">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
