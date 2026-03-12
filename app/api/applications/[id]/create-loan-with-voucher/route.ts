import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import { sendSms } from "@/lib/sms"
import { z } from "zod"
import { LOAN_TYPE_CONFIG } from "@/lib/loan-config"
import { checkRenewalEligibility, computeAmortization } from "@/lib/loan-calculator"
import type { AmortizationType } from "@prisma/client"

const bodySchema = z.object({
  releaseMethod: z.enum(["CASH", "CHEQUE"]),
  chequeNo: z.string().optional(),
  releasedAt: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { releaseMethod, chequeNo, releasedAt } = parsed.data

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
  const principalRequested = application.amount
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
  // Renewal rule: if member has an existing unpaid loan but has paid at least 70%,
  // allow renewal and deduct remaining balance from the new loan principal.
  const existingUnpaidLoan = await prisma.loan.findFirst({
    where: {
      memberId: application.memberId,
      status: { in: ["ACTIVE", "DELINQUENT"] },
      outstandingBalance: { gt: 0.01 },
    },
    select: { id: true, loanNo: true, principalAmount: true, outstandingBalance: true },
    orderBy: { createdAt: "desc" },
  })

  let principal = principalRequested
  let renewalDeducted = 0
  if (existingUnpaidLoan) {
    const paid = Math.max(0, existingUnpaidLoan.principalAmount - existingUnpaidLoan.outstandingBalance)
    const eligible = checkRenewalEligibility(paid, existingUnpaidLoan.principalAmount)
    if (!eligible) {
      return NextResponse.json(
        {
          error:
            "Loan renewal requires at least 70% of the current loan principal to be paid.",
        },
        { status: 400 },
      )
    }
    renewalDeducted = existingUnpaidLoan.outstandingBalance
    principal = Math.max(0, principalRequested - renewalDeducted)
    if (principal <= 0.01) {
      return NextResponse.json(
        { error: "Renewal deduction exceeds or equals the requested loan amount." },
        { status: 400 },
      )
    }
  }

  const scheduleRows = computeAmortization(
    principal,
    rate,
    periods,
    config.amortization,
    startDate
  )

  const releaseDate =
    releasedAt && !Number.isNaN(Date.parse(releasedAt))
      ? new Date(releasedAt)
      : new Date()
  const userId = session.user.id

  const [loanCount, voucherCount] = await Promise.all([
    prisma.loan.count(),
    prisma.loanVoucher.count(),
  ])
  const loanNo = `LN-${String(loanCount + 1).padStart(5, "0")}`
  const voucherNo = `VOU-${String(voucherCount + 1).padStart(5, "0")}`

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
      releasedAt: releaseDate,
      renewalFromLoanId: existingUnpaidLoan?.id ?? null,
      renewalDeducted,
      voucherIssuedAt: releaseDate,
      voucherIssuedById: userId,
      passbookIssuedAt: releaseDate,
      passbookIssuedById: userId,
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
      voucher: {
        create: {
          voucherNo,
          releaseMethod,
          chequeNo: releaseMethod === "CHEQUE" ? chequeNo ?? null : null,
          releasedAt: releaseDate,
        },
      },
    },
    include: { amortizationSchedule: true, voucher: true },
  })

  if (existingUnpaidLoan && renewalDeducted > 0) {
    // Mark the previous loan as renewed and clear its outstanding balance.
    await prisma.loan.update({
      where: { id: existingUnpaidLoan.id },
      data: { status: "RENEWED", outstandingBalance: 0 },
    })
    await createActivityLog({
      userId,
      action: "LOAN_RENEWED",
      entityType: "Loan",
      entityId: existingUnpaidLoan.id,
      details: `Renewed by ${loan.loanNo} · Deducted balance ${renewalDeducted.toLocaleString("en-PH")}`,
    })
  }

  await prisma.loanApplication.update({
    where: { id },
    data: { status: "RELEASED", fundedById: userId },
  })

  const appNo = application.applicationNo
  const memberLabel = application.member?.name ?? application.member?.memberNo ?? "Unknown member"
  await createActivityLog({
    userId,
    action: "APP_RELEASED",
    entityType: "LoanApplication",
    entityId: id,
    details: `Application ${appNo} · ${memberLabel} · Loan ${loan.loanNo} · Voucher ${loan.voucher?.voucherNo ?? voucherNo}`,
  })

  // SMS: Loan released (voucher created)
  const smsBody = `MCFMP: Your loan ${loan.loanNo} has been RELEASED. Please claim your voucher and passbook at the office and keep them for payment validation.`
  const smsResult = await sendSms(application.member?.contactNo ?? null, smsBody)
  if (!smsResult.ok) {
    console.warn("SMS (loan released):", smsResult.error)
  }

  return NextResponse.json({
    id: loan.id,
    loanNo: loan.loanNo,
    voucherNo: loan.voucher?.voucherNo,
  })
}
