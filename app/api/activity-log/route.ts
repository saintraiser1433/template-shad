import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const action = searchParams.get("action")?.trim() || undefined
  const entityType = searchParams.get("entityType")?.trim() || undefined

  const where = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
  })
}
