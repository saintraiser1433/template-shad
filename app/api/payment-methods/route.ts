import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  type: z.string().min(1, "Type is required"),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Admin: all; Member & Treasurer: active only (for payment form)
  if (session.user.role === "ADMIN") {
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(paymentMethods)
  }
  if (
    session.user.role === "MEMBER" ||
    session.user.role === "TREASURER"
  ) {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(paymentMethods)
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      accountName: parsed.data.accountName.trim(),
      accountNumber: parsed.data.accountNumber.trim(),
      type: parsed.data.type.trim(),
      status: "ACTIVE",
    },
  })
  return NextResponse.json(paymentMethod, { status: 201 })
}
