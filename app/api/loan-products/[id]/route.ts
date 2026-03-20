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
  requiresGoodStanding: z.boolean().optional(),
  maxCbuPercent: z.number().min(0).max(100).optional(),
  maxAmountFixed: z.number().min(0).optional(),
  amortization: z.enum(["MONTHLY", "DAILY", "LUMPSUM"]),
  interestRate: z.number().min(0),
  interestLabel: z.string().min(1),
  penaltyRate: z.number().min(0),
  penaltyLabel: z.string().min(1),
  requirementIds: z.array(z.string()).optional(),
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
  const product = await prisma.loanProduct.findUnique({
    where: { id },
    include: {
      requirements: {
        include: { requirement: true },
        orderBy: { requirement: { sortOrder: "asc" } },
      },
    },
  })
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({
    ...product,
    requirements: product.requirements.map((r) => ({
      id: r.requirement.id,
      name: r.requirement.name,
      sortOrder: r.requirement.sortOrder,
    })),
  })
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

  const { requirementIds, ...data } = parsed.data

  const product = await prisma.$transaction(async (tx) => {
    await tx.loanProduct.update({
      where: { id },
      data,
    })
    if (requirementIds !== undefined) {
      await tx.loanProductRequirement.deleteMany({
        where: { loanProductId: id },
      })
      if (requirementIds.length > 0) {
        await tx.loanProductRequirement.createMany({
          data: requirementIds.map((requirementId) => ({
            loanProductId: id,
            requirementId,
          })),
        })
      }
    }
    return tx.loanProduct.findUnique({
      where: { id },
      include: {
        requirements: {
          include: { requirement: true },
          orderBy: { requirement: { sortOrder: "asc" } },
        },
      },
    })
  })

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...product,
    requirements: product.requirements.map((r) => ({
      id: r.requirement.id,
      name: r.requirement.name,
      sortOrder: r.requirement.sortOrder,
    })),
  })
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

