import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
    include: { application: true },
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

  if (loan.applicationId) {
    await prisma.loanApplication.update({
      where: { id: loan.applicationId },
      data: { status: "RELEASED" },
    })
  }

  return NextResponse.json(voucher, { status: 201 })
}
