import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendSms } from "@/lib/sms"
import { z } from "zod"

const bodySchema = z.object({
  phoneNumber: z.string().min(3),
  message: z.string().min(1).max(320).default("Test SMS from MCFMP-CMLMS"),
})

export async function POST(req: NextRequest) {
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
  const { phoneNumber, message } = parsed.data
  const result = await sendSms(phoneNumber, message)
  if (!result.ok) {
    const isBadRequest =
      result.error.includes("not configured") ||
      result.error.includes("Invalid or missing")
    const status = isBadRequest ? 400 : 502
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ success: true })
}

