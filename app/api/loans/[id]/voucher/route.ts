import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import { z } from "zod"

const createVoucherSchema = z.object({
  releaseMethod: z.enum(["CASH", "CHEQUE"]),
  chequeNo: z.string().optional(),
  releasedAt: z.string().datetime().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id: loanId } = await params
  const voucher = await prisma.loanVoucher.findUnique({
    where: { loanId },
    include: { loan: { include: { member: true } } },
  })
  if (!voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
  }
  // Access control:
  // - Finance/Admin can view any voucher
  // - Members can only view vouchers for their own loans
  const role = session.user.role
  const financeRoles = ["TREASURER", "LOANS_CLERK", "DISBURSING_STAFF", "CASHIER"]
  const canViewAny = role === "ADMIN" || financeRoles.includes(role)
  const isOwnMemberLoan =
    role === "MEMBER" &&
    voucher.loan.member.userId != null &&
    voucher.loan.member.userId === session.user.id
  if (!canViewAny && !isOwnMemberLoan) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json(voucher)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id: loanId } = await params
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      application: true,
      member: true,
    },
  })
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 })
  }
  const existing = await prisma.loanVoucher.findUnique({
    where: { loanId },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Voucher already exists for this loan" },
      { status: 400 }
    )
  }
  const body = await req.json()
  const parsed = createVoucherSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { releaseMethod, chequeNo, releasedAt } = parsed.data
  const count = await prisma.loanVoucher.count()
  const voucherNo = `VOU-${String(count + 1).padStart(5, "0")}`

  const voucher = await prisma.loanVoucher.create({
    data: {
      voucherNo,
      releaseMethod,
      chequeNo: releaseMethod === "CHEQUE" ? chequeNo ?? null : null,
      releasedAt: releasedAt ? new Date(releasedAt) : new Date(),
      loanId,
    },
    include: { loan: { include: { member: true } } },
  })

  // Mark voucher + passbook as issued for payment validation
  await prisma.loan.update({
    where: { id: loanId },
    data: {
      voucherIssuedAt: loan.voucherIssuedAt ?? voucher.releasedAt,
      voucherIssuedById: loan.voucherIssuedById ?? session.user.id,
      passbookIssuedAt: loan.passbookIssuedAt ?? voucher.releasedAt,
      passbookIssuedById: loan.passbookIssuedById ?? session.user.id,
      releasedAt: loan.releasedAt ?? voucher.releasedAt,
    },
  })

  if (loan.applicationId) {
    await prisma.loanApplication.update({
      where: { id: loan.applicationId },
      data: { status: "RELEASED" },
    })
    const app = loan.application
    if (app) {
      const appNo = app.applicationNo
      const memberLabel = loan.member?.name ?? loan.member?.memberNo ?? "Unknown member"
      await createActivityLog({
        userId: session.user.id,
        action: "APP_RELEASED",
        entityType: "LoanApplication",
        entityId: loan.applicationId,
        details: `Application ${appNo} · ${memberLabel} · Loan ${loan.loanNo} · Voucher ${voucherNo}`,
      })
    }
  }

  return NextResponse.json(voucher, { status: 201 })
}
