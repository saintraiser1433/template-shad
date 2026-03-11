import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bodySchema = z.object({
  baseUrl: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
})

const DEFAULT_BASE_URL = "https://api.sms-gate.app/3rdparty/v1"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const settings = await prisma.smsSettings.findFirst()
  if (!settings) {
    return NextResponse.json({
      baseUrl: DEFAULT_BASE_URL,
      username: "",
    })
  }
  return NextResponse.json({
    baseUrl: settings.baseUrl || DEFAULT_BASE_URL,
    username: settings.username,
    // never return password to client
  })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { username, password } = parsed.data
  const normalizedBaseUrl = DEFAULT_BASE_URL

  await prisma.smsSettings.upsert({
    where: { id: "singleton" },
    update: { baseUrl: normalizedBaseUrl, username, password },
    create: { id: "singleton", baseUrl: normalizedBaseUrl, username, password },
  })

  return NextResponse.json({ success: true })
}

