import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const [totalMembers, activeLoans, delinquentLoans, todayPayments] =
    await Promise.all([
      prisma.member.count(),
      prisma.loan.count({ where: { status: "ACTIVE" } }),
      prisma.loan.count({ where: { status: "DELINQUENT" } }),
      prisma.payment.count({
        where: {
          paymentDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ])
  const todayCollections = await prisma.payment.aggregate({
    where: {
      paymentDate: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    },
    _sum: { amount: true },
  })
  return NextResponse.json({
    totalMembers,
    activeLoans,
    delinquentLoans,
    todayPayments,
    todayCollections: todayCollections._sum.amount ?? 0,
  })
}
