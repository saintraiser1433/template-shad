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
import { formatDate } from "@/lib/date-format"
import { Users, Wallet, AlertCircle, Banknote } from "lucide-react"
import Link from "next/link"
import { LoanTypeBarChart } from "./loan-type-bar-chart"
import { CollectionsLineChart } from "./collections-line-chart"
import { LoanStatusDonutChart } from "./loan-status-donut-chart"
import { MonthSelector } from "./month-selector"

/** YYYY-MM-DD in local time (so "today" and payment dates align with the graph). */
function getLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function getMonthRange(monthParam: string | undefined) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const currentMonthValue = `${year}-${String(month + 1).padStart(2, "0")}`
  const selected = monthParam?.trim() || currentMonthValue
  const [y, m] = selected.split("-").map(Number)
  const start = new Date(y, (m ?? 1) - 1, 1)
  start.setHours(0, 0, 0, 0)
  const isCurrentMonth = selected === currentMonthValue
  const end = isCurrentMonth
    ? new Date(now.getTime())
    : new Date(y, (m ?? 1), 0, 23, 59, 59, 999)
  return { start, end, isCurrentMonth, monthLabel: `${start.toLocaleString("default", { month: "short" })} ${start.getFullYear()}` }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const params = await searchParams
  const { start: monthStart, end: monthEnd, monthLabel } = getMonthRange(params.month)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const isMember = session.user.role === "MEMBER"
  const member = isMember
    ? await prisma.member.findFirst({
        where: { userId: session.user.id },
        select: { id: true, cbu: true },
      })
    : null

  const memberId = member?.id ?? null

  if (isMember && memberId) {
    // ——— Member dashboard: exclusive data for this member ———
    const [
      myActiveLoans,
      myOutstandingSum,
      myDelinquentCount,
      myPaymentsTodayCount,
      myPaymentsTodaySum,
      myLoanStatusGroups,
      myLoanTypeGroups,
      myPaymentsInMonth,
    ] = await Promise.all([
      prisma.loan.count({
        where: { memberId, status: "ACTIVE" },
      }),
      prisma.loan.aggregate({
        where: { memberId, status: { in: ["ACTIVE", "DELINQUENT"] } },
        _sum: { outstandingBalance: true },
      }),
      prisma.loan.count({
        where: { memberId, status: "DELINQUENT" },
      }),
      prisma.payment.count({
        where: {
          paymentDate: { gte: todayStart, lt: tomorrowStart },
          loan: { memberId },
        },
      }),
      prisma.payment.aggregate({
        where: {
          paymentDate: { gte: todayStart, lt: tomorrowStart },
          loan: { memberId },
        },
        _sum: { amount: true },
      }),
      prisma.loan.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { memberId },
      }),
      prisma.loan.groupBy({
        by: ["loanType"],
        _count: { _all: true },
        where: { memberId },
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: { gte: monthStart, lte: monthEnd },
          loan: { memberId },
        },
        select: { paymentDate: true, amount: true },
        orderBy: { paymentDate: "asc" },
      }),
    ])

    const myLoanStatusData = ["ACTIVE", "PAID", "DELINQUENT", "RENEWED"].map(
      (status) => ({
        label: status,
        value:
          myLoanStatusGroups.find((g) => g.status === status)?._count._all ?? 0,
      })
    )

    const myLoanTypeData = [
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
        myLoanTypeGroups.find((g) => g.loanType === type as any)?._count._all ?? 0,
    }))

    const myDailyCollectionsMap = new Map<string, number>()
    const startDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate())
    const endDay = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate())
    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      myDailyCollectionsMap.set(getLocalDateKey(d), 0)
    }
    for (const p of myPaymentsInMonth) {
      const key = getLocalDateKey(p.paymentDate)
      if (myDailyCollectionsMap.has(key)) {
        myDailyCollectionsMap.set(
          key,
          (myDailyCollectionsMap.get(key) ?? 0) + p.amount
        )
      }
    }
    const myDailyCollectionsData = Array.from(myDailyCollectionsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        label: formatDate(date),
        value: amount,
      }))

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
                  <BreadcrumbPage>My overview</BreadcrumbPage>
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
                  My active loans
                </CardTitle>
                <Wallet className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myActiveLoans}</div>
                <p className="text-xs text-muted-foreground">
                  <Link href="/loans" className="underline hover:no-underline">
                    View my loans
                  </Link>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  My total outstanding
                </CardTitle>
                <Wallet className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{(myOutstandingSum._sum.outstandingBalance ?? 0).toLocaleString("en-PH")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Balance across active/delinquent loans
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  My payments today
                </CardTitle>
                <Banknote className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{(myPaymentsTodaySum._sum.amount ?? 0).toLocaleString("en-PH")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {myPaymentsTodayCount} payment(s) today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  My CBU
                </CardTitle>
                <Wallet className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{(member?.cbu ?? 0).toLocaleString("en-PH")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Capital build-up balance
                </p>
              </CardContent>
            </Card>
            {myDelinquentCount > 0 && (
              <Card className="md:col-span-2 lg:col-span-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Delinquent loans
                  </CardTitle>
                  <AlertCircle className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myDelinquentCount}</div>
                  <p className="text-xs text-muted-foreground">
                    <Link href="/loans" className="underline hover:no-underline">
                      View my loans
                    </Link>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">My charts</h2>
            <MonthSelector />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  My payments ({monthLabel})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Your payments from start of month to present.
                </p>
              </CardHeader>
              <CardContent>
                <CollectionsLineChart data={myDailyCollectionsData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  My loans by status
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Your loans by status.
                </p>
              </CardHeader>
              <CardContent>
                <LoanStatusDonutChart data={myLoanStatusData} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                My loans by type
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Your loans by type.
              </p>
            </CardHeader>
            <CardContent>
              <LoanTypeBarChart data={myLoanTypeData} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ——— Admin only: full system-wide dashboard ———
  const role = session.user.role ?? ""

  if (role === "ADMIN") {
    const [
      totalMembers,
      activeLoans,
      delinquentLoans,
      todayPayments,
      todaySum,
      loanStatusGroups,
      loanTypeGroups,
      paymentsInMonth,
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
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.loan.groupBy({
        by: ["loanType"],
        _count: { _all: true },
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: { gte: monthStart, lte: monthEnd },
        },
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
    const startDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate())
    const endDay = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate())
    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      dailyCollectionsMap.set(getLocalDateKey(d), 0)
    }
    for (const p of paymentsInMonth) {
      const key = getLocalDateKey(p.paymentDate)
      if (dailyCollectionsMap.has(key)) {
        dailyCollectionsMap.set(
          key,
          (dailyCollectionsMap.get(key) ?? 0) + p.amount
        )
      }
    }
    const dailyCollectionsData = Array.from(dailyCollectionsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        label: formatDate(date),
        value: amount,
      }))

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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Charts</h2>
            <MonthSelector />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Collections ({monthLabel})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  From start of month to present. Select another month to view history.
                </p>
              </CardHeader>
              <CardContent>
                <CollectionsLineChart data={dailyCollectionsData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Loans by status ({monthLabel})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Loans created in this period.
                </p>
              </CardHeader>
              <CardContent>
                <LoanStatusDonutChart data={loanStatusData} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Loans by type ({monthLabel})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Loans created in this period.
              </p>
            </CardHeader>
            <CardContent>
              <LoanTypeBarChart data={loanTypeData} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ——— Non-admin roles: role-based summary + shared charts ———
  const financeRoles = ["TREASURER", "LOANS_CLERK", "CASHIER", "DISBURSING_STAFF"]
  const isFinance = financeRoles.includes(role)

  const [
    todayPaymentsRole,
    todaySumRole,
    pendingApprovalCount,
    managerReviewCount,
    committeeReviewCount,
    boardReviewCount,
    pendingCibiCount,
    collectionsMonthSum,
    loanStatusGroupsRole,
    loanTypeGroupsRole,
    paymentsInMonthRole,
  ] = await Promise.all([
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
    prisma.payment.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.loanApplication.count({ where: { status: "MANAGER_REVIEW" } }),
    prisma.loanApplication.count({ where: { status: "COMMITTEE_REVIEW" } }),
    prisma.loanApplication.count({ where: { status: "BOARD_REVIEW" } }),
    prisma.loanApplication.count({
      where: { status: { in: ["PENDING", "CIBI_REVIEW"] } },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: monthStart, lte: monthEnd },
        status: "APPROVED",
      },
      _sum: { amount: true },
    }),
    prisma.loan.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.loan.groupBy({
      by: ["loanType"],
      _count: { _all: true },
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.payment.findMany({
      where: {
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
      select: { paymentDate: true, amount: true },
      orderBy: { paymentDate: "asc" },
    }),
  ])

  const loanStatusDataRole = ["ACTIVE", "PAID", "DELINQUENT", "RENEWED"].map(
    (status) => ({
      label: status,
      value:
        loanStatusGroupsRole.find((g) => g.status === status)?._count._all ?? 0,
    })
  )

  const loanTypeDataRole = [
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
      loanTypeGroupsRole.find((g) => g.loanType === type as any)?._count._all ?? 0,
  }))

  const dailyCollectionsMapRole = new Map<string, number>()
  const startDayRole = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate())
  const endDayRole = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate())
  for (let d = new Date(startDayRole); d <= endDayRole; d.setDate(d.getDate() + 1)) {
    dailyCollectionsMapRole.set(getLocalDateKey(d), 0)
  }
  for (const p of paymentsInMonthRole) {
    const key = getLocalDateKey(p.paymentDate)
    if (dailyCollectionsMapRole.has(key)) {
      dailyCollectionsMapRole.set(
        key,
        (dailyCollectionsMapRole.get(key) ?? 0) + p.amount
      )
    }
  }
  const dailyCollectionsDataRole = Array.from(dailyCollectionsMapRole.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      label: formatDate(date),
      value: amount,
    }))

  const roleTitle =
    isFinance
      ? "Finance overview"
      : role === "MANAGER"
        ? "Manager overview"
        : role === "CREDIT_COMMITTEE"
          ? "Committee overview"
          : role === "BOARD_OF_DIRECTORS"
            ? "Board overview"
            : role === "COLLECTOR"
              ? "Collector overview"
              : "Overview"

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
                <BreadcrumbPage>{roleTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isFinance && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today&apos;s collections
                  </CardTitle>
                  <Banknote className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{(todaySumRole._sum.amount ?? 0).toLocaleString("en-PH")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayPaymentsRole} payment(s) today
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending approval
                  </CardTitle>
                  <AlertCircle className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingApprovalCount}</div>
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
                    Collections ({monthLabel})
                  </CardTitle>
                  <Wallet className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{(collectionsMonthSum._sum.amount ?? 0).toLocaleString("en-PH")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Approved payments this month
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {role === "MANAGER" && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    In manager review
                  </CardTitle>
                  <AlertCircle className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{managerReviewCount}</div>
                  <p className="text-xs text-muted-foreground">
                    <Link href="/loans/for-approval" className="underline hover:no-underline">
                      For approval
                    </Link>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today&apos;s collections
                  </CardTitle>
                  <Banknote className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{(todaySumRole._sum.amount ?? 0).toLocaleString("en-PH")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayPaymentsRole} payment(s) today
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {role === "CREDIT_COMMITTEE" && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    In committee review
                  </CardTitle>
                  <AlertCircle className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{committeeReviewCount}</div>
                  <p className="text-xs text-muted-foreground">
                    <Link href="/loans/for-approval" className="underline hover:no-underline">
                      For approval
                    </Link>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today&apos;s collections
                  </CardTitle>
                  <Banknote className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{(todaySumRole._sum.amount ?? 0).toLocaleString("en-PH")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayPaymentsRole} payment(s) today
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {role === "BOARD_OF_DIRECTORS" && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    In board review
                  </CardTitle>
                  <AlertCircle className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{boardReviewCount}</div>
                  <p className="text-xs text-muted-foreground">
                    <Link href="/loans/for-approval" className="underline hover:no-underline">
                      For approval
                    </Link>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today&apos;s collections
                  </CardTitle>
                  <Banknote className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{(todaySumRole._sum.amount ?? 0).toLocaleString("en-PH")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayPaymentsRole} payment(s) today
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {role === "COLLECTOR" && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending CI/BI
                  </CardTitle>
                  <AlertCircle className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingCibiCount}</div>
                  <p className="text-xs text-muted-foreground">
                    <Link href="/loans/pending" className="underline hover:no-underline">
                      Pending CI/BI
                    </Link>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today&apos;s collections
                  </CardTitle>
                  <Banknote className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{(todaySumRole._sum.amount ?? 0).toLocaleString("en-PH")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayPaymentsRole} payment(s) today
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {!isFinance &&
            role !== "MANAGER" &&
            role !== "CREDIT_COMMITTEE" &&
            role !== "BOARD_OF_DIRECTORS" &&
            role !== "COLLECTOR" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Today&apos;s collections
                  </CardTitle>
                  <Banknote className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{(todaySumRole._sum.amount ?? 0).toLocaleString("en-PH")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayPaymentsRole} payment(s) today
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Charts</h2>
          <MonthSelector />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Collections ({monthLabel})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                From start of month to present. Select another month to view history.
              </p>
            </CardHeader>
            <CardContent>
              <CollectionsLineChart data={dailyCollectionsDataRole} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Loans by status ({monthLabel})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Loans created in this period.
              </p>
            </CardHeader>
            <CardContent>
              <LoanStatusDonutChart data={loanStatusDataRole} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Loans by type ({monthLabel})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Loans created in this period.
            </p>
          </CardHeader>
          <CardContent>
            <LoanTypeBarChart data={loanTypeDataRole} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
