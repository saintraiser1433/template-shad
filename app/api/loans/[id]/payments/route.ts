import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.coerce.date(),
  remarks: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const payments = await prisma.payment.findMany({
    where: { loanId: id },
    orderBy: { paymentDate: "desc" },
  })
  return NextResponse.json(payments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const parsed = createPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { amount, remarks } = parsed.data
  const paymentDate =
    typeof parsed.data.paymentDate === "string"
      ? new Date(parsed.data.paymentDate)
      : parsed.data.paymentDate

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { amortizationSchedule: { orderBy: { sequence: "asc" } } },
  })
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 })
  }
  if (loan.status !== "ACTIVE" && loan.status !== "DELINQUENT") {
    return NextResponse.json(
      { error: "Payments can only be recorded for active or delinquent loans" },
      { status: 400 }
    )
  }

  let remaining = amount
  let principalApplied = 0
  let interestApplied = 0
  let penaltyApplied = 0
  const schedule = loan.amortizationSchedule

  for (const row of schedule) {
    if (row.isPaid || remaining <= 0) continue
    const totalDue = row.totalDue + row.penalty
    const pay = Math.min(remaining, totalDue)
    if (pay <= 0) continue
    const penaltyPart = Math.min(pay, row.penalty)
    const rest = pay - penaltyPart
    const interestPart = Math.min(rest, row.interest)
    const principalPart = rest - interestPart
    penaltyApplied += penaltyPart
    interestApplied += interestPart
    principalApplied += principalPart
    remaining -= pay
    const rowFullyPaid =
      principalPart >= row.principal &&
      interestPart >= row.interest &&
      penaltyPart >= row.penalty
    await prisma.amortizationSchedule.update({
      where: { id: row.id },
      data: {
        isPaid: rowFullyPaid,
        paidAt: rowFullyPaid ? paymentDate : null,
      },
    })
  }

  const newOutstanding = Math.max(
    0,
    loan.outstandingBalance - principalApplied
  )
  await prisma.loan.update({
    where: { id },
    data: {
      outstandingBalance: newOutstanding,
      status: newOutstanding <= 0 ? "PAID" : loan.status,
    },
  })

  const payment = await prisma.payment.create({
    data: {
      loanId: id,
      amount,
      principal: principalApplied,
      interest: interestApplied,
      penalty: penaltyApplied,
      paymentDate,
      remarks,
      collectedById: session.user.id,
    },
  })
  return NextResponse.json(payment)
}
