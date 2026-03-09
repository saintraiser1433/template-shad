import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, uploadedById: true },
    })
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }
    // Allow delete if uploader or (if roles are present) admin. If roles aren't on session, this just checks uploader.
    if (doc.uploadedById && doc.uploadedById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.document.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Delete document error:", err)
    return NextResponse.json(
      { error: "Internal server error while deleting document" },
      { status: 500 }
    )
  }
}

