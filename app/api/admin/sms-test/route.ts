import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bodySchema = z.object({
  phoneNumber: z.string().min(3),
  message: z.string().min(1).max(320).default("Test SMS from MCFMP-CMLMS"),
})

function normalizePhMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("639") && digits.length === 12) {
    return `+${digits}`
  }
  if (digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return `+639${digits}`
  }
  return null
}

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
  const normalized = normalizePhMobile(phoneNumber)
  if (!normalized) {
    return NextResponse.json(
      { error: "Phone number must be PH mobile (e.g. +63917xxxxxxx or 0917xxxxxxx)." },
      { status: 400 },
    )
  }

  const settings = await prisma.smsSettings.findFirst()
  if (!settings) {
    return NextResponse.json(
      { error: "SMS settings are not configured." },
      { status: 400 },
    )
  }

  const endpoint = `${settings.baseUrl.replace(/\/+$/, "")}/message`
  const authHeader =
    "Basic " +
    Buffer.from(`${settings.username}:${settings.password}`, "utf8").toString("base64")

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        textMessage: { text: message },
        phoneNumbers: [normalized],
      }),
    })

    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to send SMS via gateway", status: res.status, body: text },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, status: res.status, body: text })
  } catch (e) {
    console.error("SMS test error", e)
    return NextResponse.json(
      { error: "Error calling SMS gateway" },
      { status: 500 },
    )
  }
}

