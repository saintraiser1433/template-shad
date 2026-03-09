import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      loans: {
        orderBy: { createdAt: "desc" },
        include: { amortizationSchedule: true },
      },
    },
  })
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }
  const goodStanding = member.isRegularMember && member.cbu >= 20000
  return NextResponse.json({ ...member, goodStanding })
}

const { z } = await import("zod")
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  religion: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
})

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
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data = parsed.data
  const updateData: Parameters<typeof prisma.member.update>[0]["data"] = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.religion !== undefined) updateData.religion = data.religion
  if (data.status !== undefined) updateData.status = data.status
  const member = await prisma.member.update({
    where: { id },
    data: updateData,
  })
  return NextResponse.json(member)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  await prisma.member.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
