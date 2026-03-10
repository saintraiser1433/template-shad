import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LOAN_TYPE_CONFIG } from "@/lib/loan-config"
import { computeAmortization } from "@/lib/loan-calculator"
import type { AmortizationType } from "@prisma/client"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: { member: true },
  })
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }
  if (application.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only approved applications can be converted to loans" },
      { status: 400 }
    )
  }
  const existing = await prisma.loan.findFirst({
    where: { applicationId: id },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Loan already created for this application" },
      { status: 400 }
    )
  }

  const config = LOAN_TYPE_CONFIG[application.loanType]
  const principal = application.amount
  const termMonths = application.termMonths ?? 1
  const termDays = application.termDays ?? termMonths * 30
  const rate = config.interestRate
  const periods =
    config.amortization === "DAILY"
      ? Math.min(Math.max(termDays, 45), 50)
      : config.amortization === "LUMPSUM"
        ? termMonths
        : termMonths
  const startDate = new Date()
  const scheduleRows = computeAmortization(
    principal,
    rate,
    periods,
    config.amortization,
    startDate
  )

  const loanCount = await prisma.loan.count()
  const loanNo = `LN-${String(loanCount + 1).padStart(5, "0")}`

  const loan = await prisma.loan.create({
    data: {
      loanNo,
      loanType: application.loanType,
      principalAmount: principal,
      interestRate: rate,
      termMonths: application.termMonths,
      termDays: application.termDays,
      amortizationType: config.amortization as AmortizationType,
      outstandingBalance: principal,
      status: "ACTIVE",
      applicationId: application.id,
      memberId: application.memberId,
      releasedAt: new Date(),
      amortizationSchedule: {
        create: scheduleRows.map((row, i) => ({
          dueDate: row.dueDate,
          principal: row.principal,
          interest: row.interest,
          totalDue: row.totalDue,
          penalty: 0,
          sequence: i + 1,
        })),
      },
    },
    include: { amortizationSchedule: true },
  })

  const userId = session.user.id
  await prisma.loanApplication.update({
    where: { id },
    data: { status: "FUNDED", fundedById: userId },
  })

  return NextResponse.json(loan)
}
