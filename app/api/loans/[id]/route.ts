import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ApplicationStatus } from "@prisma/client"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: true,
      application: true,
      amortizationSchedule: { orderBy: { sequence: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  })
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 })
  }
  return NextResponse.json(loan)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const status = body.status as ApplicationStatus | undefined
  const loan = await prisma.loan.findUnique({ where: { id } })
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 })
  }
  if (status) {
    await prisma.loan.update({
      where: { id },
      data: { status: body.status },
    })
  }
  const updated = await prisma.loan.findUnique({
    where: { id },
    include: { member: true },
  })
  return NextResponse.json(updated)
}
