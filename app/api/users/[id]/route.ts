import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import { z } from "zod"
import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"

const ROLES: Role[] = [
  "ADMIN",
  "MANAGER",
  "COLLECTOR",
  "CREDIT_COMMITTEE",
  "BOARD_OF_DIRECTORS",
  "TREASURER",
  "LOANS_CLERK",
  "DISBURSING_STAFF",
  "CASHIER",
  "MEMBER",
]

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(ROLES as [Role, ...Role[]]).optional(),
  password: z.string().min(6).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  return NextResponse.json(user)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data: {
    name?: string
    role?: Role
    passwordHash?: string
    status?: "ACTIVE" | "INACTIVE"
  } = {}
  if (parsed.data.name != null) data.name = parsed.data.name
  if (parsed.data.role != null) data.role = parsed.data.role
  if (parsed.data.status != null) data.status = parsed.data.status
  if (parsed.data.password != null && parsed.data.password !== "") {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10)
  }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  })
  const action =
    data.status === "INACTIVE"
      ? "USER_DEACTIVATED"
      : data.status === "ACTIVE"
        ? "USER_ACTIVATED"
        : "USER_UPDATED"
  await createActivityLog({
    userId: session.user.id,
    action,
    entityType: "User",
    entityId: user.id,
    details: user.email,
  }).catch(() => {})
  return NextResponse.json(user)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    )
  }
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
