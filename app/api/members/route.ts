import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createMemberSchema = z.object({
  memberNo: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  contactNo: z.string().optional(),
  religion: z.string().optional(),
  occupation: z.string().optional(),
  cbu: z.number().min(0).default(0),
  isRegularMember: z.boolean().default(false),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const members = await prisma.member.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { memberNo: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { memberNo: "asc" },
    include: { _count: { select: { loans: true } } },
  })
  return NextResponse.json(
    members.map((m) => ({
      ...m,
      goodStanding: m.isRegularMember && m.cbu >= 20000,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const parsed = createMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data = parsed.data
  const existing = await prisma.member.findUnique({
    where: { memberNo: data.memberNo },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Member number already exists" },
      { status: 409 }
    )
  }
  let userId: string | undefined
  if (data.email) {
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 10)
      : undefined
    if (passwordHash) {
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
          role: "MEMBER",
        },
      })
      userId = user.id
    }
  }
  const member = await prisma.member.create({
    data: {
      memberNo: data.memberNo,
      name: data.name,
      address: data.address,
      contactNo: data.contactNo,
      religion: data.religion,
      occupation: data.occupation,
      cbu: data.cbu,
      isRegularMember: data.isRegularMember,
      userId,
    },
  })
  return NextResponse.json(member)
}
