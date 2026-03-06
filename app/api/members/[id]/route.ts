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
  const member = await prisma.member.update({
    where: { id },
    data: {
      name: body.name,
      address: body.address,
      contactNo: body.contactNo,
      religion: body.religion,
      occupation: body.occupation,
      cbu: body.cbu,
      isRegularMember: body.isRegularMember,
    },
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
