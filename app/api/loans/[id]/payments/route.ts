import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.coerce.date(),
  remarks: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptDocumentId: z.string().optional(),
   scheduleId: z.string().optional(),
  referenceNo: z.string().max(100).optional(),
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
  const {
    amount,
    remarks,
    paymentMethod,
    receiptDocumentId,
    scheduleId,
    referenceNo,
  } = parsed.data
  const paymentDate =
    typeof parsed.data.paymentDate === "string"
      ? new Date(parsed.data.paymentDate)
      : parsed.data.paymentDate
  const isCash = !paymentMethod || paymentMethod.toUpperCase() === "CASH"
  const isMember = session.user.role === "MEMBER"
  const createPendingOnly = isMember && !isCash

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: { select: { userId: true } },
      application: {
        include: { loanProduct: true },
      },
      amortizationSchedule: { orderBy: { sequence: "asc" } },
    },
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

  // Members may only record payments for their own loan
  if (session.user.role === "MEMBER") {
    if (
      loan.member.userId == null ||
      loan.member.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only record payments for your own loan" },
        { status: 403 }
      )
    }
  }

  // Member online (non-CASH): create pending payment only; no schedule/balance update
  if (createPendingOnly) {
    if (!referenceNo || referenceNo.trim() === "") {
      return NextResponse.json(
        { error: "Reference number is required for online payments." },
        { status: 400 },
      )
    }
    const payment = await prisma.payment.create({
      data: {
        loanId: id,
        amount,
        principal: 0,
        interest: 0,
        penalty: 0,
        paymentDate,
        paymentMethod: paymentMethod ?? undefined,
        status: "PENDING_APPROVAL",
        remarks,
        referenceNo: referenceNo || null,
        collectedById: session.user.id,
        amortizationScheduleId: scheduleId ?? undefined,
      },
    })
    if (receiptDocumentId) {
      const receipt = await prisma.document.findUnique({
        where: { id: receiptDocumentId },
        select: { id: true, uploadedById: true, category: true, paymentId: true },
      })
      if (
        receipt &&
        receipt.uploadedById === session.user.id &&
        receipt.category === "PAYMENT_RECEIPT" &&
        !receipt.paymentId
      ) {
        await prisma.document.update({
          where: { id: receiptDocumentId },
          data: { paymentId: payment.id },
        })
      }
    }
    return NextResponse.json(payment)
  }

  let remaining = amount
  let principalApplied = 0
  let interestApplied = 0
  let penaltyApplied = 0
  const schedule = loan.amortizationSchedule
  const targetScheduleId = scheduleId ?? null
  const maxCbuPercent =
    loan.application?.loanProduct?.maxCbuPercent != null
      ? loan.application.loanProduct.maxCbuPercent
      : null
  const totalCbuRequired =
    maxCbuPercent != null ? loan.principalAmount * (maxCbuPercent / 100) : 0
  const cbuPerScheduleRow =
    totalCbuRequired > 0 && schedule.length > 0
      ? totalCbuRequired / schedule.length
      : 0

  let cbuToCredit = 0

  for (const row of schedule) {
    if (targetScheduleId && row.id !== targetScheduleId) continue
    if (row.isPaid || remaining <= 0) continue
    const totalDue = row.totalDue + row.penalty
    const alreadyPaid = row.paidAmount ?? 0
    const stillOwed = Math.max(0, totalDue - alreadyPaid)
    const pay = Math.min(remaining, stillOwed)
    if (pay <= 0) continue
    // Infer what was already covered using the same priority: penalty -> interest -> principal
    const alreadyPenalty = Math.min(alreadyPaid, row.penalty)
    const alreadyInterest = Math.min(
      Math.max(0, alreadyPaid - alreadyPenalty),
      row.interest
    )
    const alreadyPrincipal = Math.max(0, alreadyPaid - alreadyPenalty - alreadyInterest)

    const penaltyRemaining = Math.max(0, row.penalty - alreadyPenalty)
    const interestRemaining = Math.max(0, row.interest - alreadyInterest)
    const principalRemaining = Math.max(0, row.principal - alreadyPrincipal)

    const penaltyPart = Math.min(pay, penaltyRemaining)
    const restAfterPenalty = pay - penaltyPart
    const interestPart = Math.min(restAfterPenalty, interestRemaining)
    const restAfterInterest = restAfterPenalty - interestPart
    const principalPart = Math.min(restAfterInterest, principalRemaining)
    penaltyApplied += penaltyPart
    interestApplied += interestPart
    principalApplied += principalPart
    remaining -= pay
    const rowFullyPaid = alreadyPaid + pay >= totalDue - 0.01
    await prisma.amortizationSchedule.update({
      where: { id: row.id },
      data: {
        paidAmount: alreadyPaid + pay,
        isPaid: rowFullyPaid,
        paidAt: rowFullyPaid ? paymentDate : null,
      },
    })

    // Only when this payment fully pays the schedule row (not partial),
    // add the fixed CBU-per-period amount for this loan to the member's CBU.
    if (rowFullyPaid && !row.isPaid && cbuPerScheduleRow > 0) {
      cbuToCredit += cbuPerScheduleRow
    }
  }

  const newOutstanding = Math.max(
    0,
    loan.outstandingBalance - principalApplied
  )
  await prisma.$transaction([
    prisma.loan.update({
      where: { id },
      data: {
        outstandingBalance: newOutstanding,
        status: newOutstanding <= 0 ? "PAID" : loan.status,
      },
    }),
    // Every approved payment adds its principal portion to the member's CBU
    prisma.member.update({
      where: { id: loan.memberId },
      data: {
        cbu: {
          increment: cbuToCredit,
        },
      },
    }),
  ])

  const payment = await prisma.payment.create({
    data: {
      loanId: id,
      amount,
      principal: principalApplied,
      interest: interestApplied,
      penalty: penaltyApplied,
      paymentDate,
      paymentMethod: isCash ? "CASH" : (paymentMethod ?? undefined),
      status: "APPROVED",
      remarks,
      referenceNo: referenceNo || null,
      collectedById: session.user.id,
      amortizationScheduleId: scheduleId ?? undefined,
    },
  })
  return NextResponse.json(payment)
}
