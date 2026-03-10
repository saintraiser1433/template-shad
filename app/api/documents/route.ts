import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

// Required because this route uses Node.js APIs (fs, path, crypto)
export const runtime = "nodejs"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const applicationId = searchParams.get("applicationId")
  const paymentId = searchParams.get("paymentId")
  if (!applicationId && !paymentId) {
    return NextResponse.json(
      { error: "applicationId or paymentId is required" },
      { status: 400 }
    )
  }
  const documents = await prisma.document.findMany({
    where: applicationId ? { applicationId } : { paymentId: paymentId ?? undefined },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(documents)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const applicationId = formData.get("applicationId") as string | null
    const category = (formData.get("category") as string) || "REQUIREMENT"
    const paymentId = (formData.get("paymentId") as string) || null
    const requirementId = (formData.get("requirementId") as string) || null

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file or empty file" },
        { status: 400 }
      )
    }
    const ext = path.extname(file.name).toLowerCase()
    const allowedExts = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".doc", ".docx"]
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: "Only PDF, images (JPG/PNG/GIF), and Word documents (.doc, .docx) are allowed" },
        { status: 400 }
      )
    }
    const allowedCategories = ["REQUIREMENT", "PHOTO", "INVESTIGATION", "PAYMENT_RECEIPT"]
    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    if (category === "PAYMENT_RECEIPT" && applicationId) {
      return NextResponse.json(
        { error: "Payment receipts must not be uploaded under an applicationId" },
        { status: 400 }
      )
    }

    await mkdir(UPLOAD_DIR, { recursive: true })
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, "_")
    const uniqueName = `${baseName}-${randomUUID()}${ext}`
    const filePath = path.join(UPLOAD_DIR, uniqueName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/${uniqueName}`

    const doc = await prisma.document.create({
      data: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type || null,
        category,
        paymentId: paymentId || undefined,
        // Use application relation (present in existing client)
        application: applicationId
          ? {
              connect: { id: applicationId },
            }
          : undefined,
        requirement: requirementId
          ? {
              connect: { id: requirementId },
            }
          : undefined,
        uploadedBy: {
          connect: { id: session.user.id },
        },
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    console.error("Document upload error:", err)
    return NextResponse.json(
      { error: "Internal server error while uploading document" },
      { status: 500 }
    )
  }
}
