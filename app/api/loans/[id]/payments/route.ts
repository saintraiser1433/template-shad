import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import { sendSms } from "@/lib/sms"
import { z } from "zod"
import { LOAN_TYPE_CONFIG } from "@/lib/loan-config"
import { computePenalty } from "@/lib/loan-calculator"

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
  const financeRoles = ["TREASURER", "LOANS_CLERK", "DISBURSING_STAFF", "CASHIER"]
  const isFinanceOfficer =
    session.user.role === "ADMIN" || financeRoles.includes(session.user.role)

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: { select: { userId: true, name: true, memberNo: true, contactNo: true } },
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
    if (!receiptDocumentId) {
      return NextResponse.json(
        { error: "Receipt/evidence of payment is required." },
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
    // Notify finance officers that a member payment is pending approval
    const financeUsers = await prisma.user.findMany({
      where: { role: { in: ["TREASURER", "ADMIN"] }, status: "ACTIVE" },
      select: { id: true },
    })
    const memberLabel =
      loan.member.name && loan.member.memberNo
        ? `${loan.member.name} (${loan.member.memberNo})`
        : "A member"
    const amountStr = `₱${amount.toLocaleString("en-PH")}`
    if (financeUsers.length > 0) {
      await prisma.notification.createMany({
        data: financeUsers.map((u) => ({
          userId: u.id,
          title: "Payment pending approval",
          message: `${memberLabel} submitted a payment of ${amountStr} for loan ${loan.loanNo}. Pending your approval.`,
          type: "PAYMENT_PENDING_APPROVAL",
          link: `/loans/${id}`,
        })),
      })
    }
    // SMS: Payment submitted (member online, pending approval)
    const amountPlain = amount.toLocaleString("en-PH")
    const smsBody = `MCFMP: Your payment of ${amountPlain} for loan ${loan.loanNo} is PENDING APPROVAL by finance. You'll receive another SMS once it is approved or rejected.`
    const smsResult = await sendSms(loan.member?.contactNo ?? null, smsBody)
    if (!smsResult.ok) {
      console.warn("SMS (payment pending):", smsResult.error)
    }
    await createActivityLog({
      userId: session.user.id,
      action: "PAYMENT_RECORDED",
      entityType: "Payment",
      entityId: payment.id,
      details: `Loan ${loan.loanNo} · ${amountStr} · Pending approval`,
    })
    return NextResponse.json(payment)
  }

  // Finance/non-member non-cash payments must include receipt upload
  if (isFinanceOfficer && !isCash && !receiptDocumentId) {
    return NextResponse.json(
      { error: "Receipt/evidence of payment is required for non-cash payments." },
      { status: 400 },
    )
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

    // Grace period rule: within 7 days after due date, no penalty is applied.
    // After grace, compute/update penalty for this schedule row as of the payment date.
    const cfg = LOAN_TYPE_CONFIG[loan.loanType]
    const penaltyComputed = computePenalty(
      row.totalDue,
      row.dueDate,
      paymentDate,
      cfg.penaltyRate,
      cfg.penaltyBase,
    )
    if (Math.abs((row.penalty ?? 0) - penaltyComputed) > 0.01) {
      await prisma.amortizationSchedule.update({
        where: { id: row.id },
        data: { penalty: penaltyComputed },
      })
      row.penalty = penaltyComputed
    }

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
      approvedById: isFinanceOfficer ? session.user.id : null,
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
  const amountStr = `₱${amount.toLocaleString("en-PH")}`
  await createActivityLog({
    userId: session.user.id,
    action: "PAYMENT_RECORDED",
    entityType: "Payment",
    entityId: payment.id,
    details: `Loan ${loan.loanNo} · ${amountStr} · Approved`,
  })
  return NextResponse.json(payment)
}
