import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const featureItemSchema = z.object({
  title: z.string().max(150),
  description: z.string().max(500),
  icon: z.string().max(50).optional().nullable(),
})

const putSchema = z.object({
  heroTitle: z.string().max(200).optional().nullable(),
  heroTitleHighlight: z.string().max(200).optional().nullable(),
  heroDescription: z.string().max(1000).optional().nullable(),
  ctaPrimaryText: z.string().max(100).optional().nullable(),
  ctaSecondaryText: z.string().max(100).optional().nullable(),
  featuresTitle: z.string().max(200).optional().nullable(),
  featuresSubtitle: z.string().max(1000).optional().nullable(),
  features: z.array(featureItemSchema).optional().nullable(),
  feature1Title: z.string().max(150).optional().nullable(),
  feature1Description: z.string().max(500).optional().nullable(),
  feature2Title: z.string().max(150).optional().nullable(),
  feature2Description: z.string().max(500).optional().nullable(),
  feature3Title: z.string().max(150).optional().nullable(),
  feature3Description: z.string().max(500).optional().nullable(),
  feature4Title: z.string().max(150).optional().nullable(),
  feature4Description: z.string().max(500).optional().nullable(),
  ctaSectionTitle: z.string().max(200).optional().nullable(),
  ctaSectionDescription: z.string().max(500).optional().nullable(),
  footerText: z.string().max(500).optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const settings = await prisma.landingPageSettings.findUnique({
    where: { id: "singleton" },
  })
  return NextResponse.json(settings ?? {})
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const json = await req.json()
  const parsed = putSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const updatePayload: Record<string, string | null | object> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === "features") {
      updatePayload[k] = Array.isArray(v) ? v : null
      continue
    }
    const str = typeof v === "string" ? v.trim() || null : null
    updatePayload[k] = v === undefined ? null : str
  }

  await prisma.landingPageSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...updatePayload },
    update: updatePayload,
  })

  return NextResponse.json({ success: true })
}
