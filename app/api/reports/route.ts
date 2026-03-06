import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const [
    outstandingLoans,
    totalOutstanding,
    delinquentLoans,
    todayCollections,
    membersWithCbu,
  ] = await Promise.all([
    prisma.loan.findMany({
      where: { status: { in: ["ACTIVE", "DELINQUENT"] } },
      include: { member: { select: { memberNo: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.aggregate({
      where: { status: { in: ["ACTIVE", "DELINQUENT"] } },
      _sum: { outstandingBalance: true },
    }),
    prisma.loan.findMany({
      where: { status: "DELINQUENT" },
      include: { member: { select: { memberNo: true, name: true } } },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { amount: true },
    }),
    prisma.member.aggregate({
      _sum: { cbu: true },
    }),
  ])

  return NextResponse.json({
    outstandingLoans,
    totalOutstanding: totalOutstanding._sum.outstandingBalance ?? 0,
    delinquentLoans,
    todayCollections: todayCollections._sum.amount ?? 0,
    totalCbu: membersWithCbu._sum.cbu ?? 0,
    memberCount: await prisma.member.count(),
  })
}
