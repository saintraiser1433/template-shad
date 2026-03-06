import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const loanProductSchema = z.object({
  name: z.string().min(1),
  termMonthsMin: z.number().int().min(0).optional(),
  termMonthsMax: z.number().int().min(0).optional(),
  termDaysMin: z.number().int().min(0).optional(),
  termDaysMax: z.number().int().min(0).optional(),
  maxCbuPercent: z.number().min(0).max(100).optional(),
  maxAmountFixed: z.number().min(0).optional(),
  amortization: z.string().min(1),
  interestRate: z.number().min(0),
  interestLabel: z.string().min(1),
  penaltyRate: z.number().min(0),
  penaltyLabel: z.string().min(1),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const product = await prisma.loanProduct.findUnique({ where: { id } })
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(product)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = loanProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const product = await prisma.loanProduct.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(product)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await prisma.loanProduct.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

