import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import { z } from "zod"

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "TREASURER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only finance officer or admin can approve or reject payments" },
      { status: 403 }
    )
  }

  const { id: loanId, paymentId } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, loanId },
    include: {
      loan: {
        include: {
          member: { select: { userId: true, name: true, memberNo: true } },
          amortizationSchedule: { orderBy: { sequence: "asc" } },
          application: {
            include: { loanProduct: true },
          },
        },
      },
    },
  })
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }
  if (payment.status !== "PENDING_APPROVAL") {
    return NextResponse.json(
      { error: "Only pending payments can be approved or rejected" },
      { status: 400 }
    )
  }

  if (parsed.data.action === "reject") {
    const reason = (parsed.data.rejectionReason ?? "").trim()
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        remarks: reason || null,
      },
    })
    const amountStr = `₱${payment.amount.toLocaleString("en-PH")}`
    await createActivityLog({
      userId: session.user.id,
      action: "PAYMENT_REJECTED",
      entityType: "Payment",
      entityId: paymentId,
      details: `Loan ${payment.loan.loanNo} · ${amountStr}${reason ? ` · Reason: ${reason.slice(0, 150)}` : ""}`,
    })
    // Notify member that their payment was rejected (with reason)
    const memberUserId = payment.loan.member?.userId
    if (memberUserId) {
      await prisma.notification.create({
        data: {
          userId: memberUserId,
          title: "Payment rejected",
          message: reason
            ? `Your payment of ${amountStr} for loan ${payment.loan.loanNo} was rejected. Reason: ${reason}`
            : `Your payment of ${amountStr} for loan ${payment.loan.loanNo} was rejected by finance.`,
          type: "PAYMENT_REJECTED",
          link: `/loans/${loanId}`,
        },
      })
    }
    return NextResponse.json({ ok: true, status: "REJECTED", rejectionReason: reason })
  }

  // Approve: apply amount to schedule and loan balance, then update payment
  const { amount, paymentDate } = payment
  const schedule = payment.loan.amortizationSchedule
  const targetScheduleId = payment.amortizationScheduleId ?? null
  let remaining = amount
  let principalApplied = 0
  let interestApplied = 0
  let penaltyApplied = 0
  const maxCbuPercent =
    payment.loan.application?.loanProduct?.maxCbuPercent != null
      ? payment.loan.application.loanProduct.maxCbuPercent
      : null
  const totalCbuRequired =
    maxCbuPercent != null
      ? payment.loan.principalAmount * (maxCbuPercent / 100)
      : 0
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

    // Only when this approval fully pays the schedule row (not partial),
    // add the fixed CBU-per-period amount for this loan to the member's CBU.
    if (rowFullyPaid && !row.isPaid && cbuPerScheduleRow > 0) {
      cbuToCredit += cbuPerScheduleRow
    }
  }

  const newOutstanding = Math.max(
    0,
    payment.loan.outstandingBalance - principalApplied
  )
  await prisma.$transaction([
    prisma.loan.update({
      where: { id: loanId },
      data: {
        outstandingBalance: newOutstanding,
        status: newOutstanding <= 0 ? "PAID" : payment.loan.status,
      },
    }),
    // Every approved payment adds its principal portion to the member's CBU
    prisma.member.update({
      where: { id: payment.loan.memberId },
      data: {
        cbu: {
          increment: cbuToCredit,
        },
      },
    }),
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        principal: principalApplied,
        interest: interestApplied,
        penalty: penaltyApplied,
        status: "APPROVED",
        approvedById: session.user.id,
      },
    }),
  ])

  const amountStr = `₱${payment.amount.toLocaleString("en-PH")}`
  await createActivityLog({
    userId: session.user.id,
    action: "PAYMENT_APPROVED",
    entityType: "Payment",
    entityId: paymentId,
    details: `Loan ${payment.loan.loanNo} · ${amountStr}`,
  })
  // Notify member that their payment was approved
  const memberUserId = payment.loan.member?.userId
  if (memberUserId) {
    await prisma.notification.create({
      data: {
        userId: memberUserId,
        title: "Payment approved",
        message: `Your payment of ${amountStr} for loan ${payment.loan.loanNo} has been approved by finance.`,
        type: "PAYMENT_APPROVED",
        link: `/loans/${loanId}`,
      },
    })
  }

  return NextResponse.json({ ok: true, status: "APPROVED" })
}
