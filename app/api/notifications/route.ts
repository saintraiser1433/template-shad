import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unreadOnly") === "true"
  const take = Math.min(Number(searchParams.get("take")) || 20, 50)
  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  })
  return NextResponse.json(notifications)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const id = body.id
  const markAllRead = body.markAllRead === true
  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  }
  if (typeof id === "string") {
    await prisma.notification.updateMany({
      where: { id, userId: session.user.id },
      data: { isRead: true },
    })
  }
  return NextResponse.json({ success: true })
}
