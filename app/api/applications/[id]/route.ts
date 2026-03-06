import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ApplicationStatus } from "@prisma/client"

const VALID_TRANSITIONS: Record<string, ApplicationStatus[]> = {
  PENDING: ["CIBI_REVIEW"],
  CIBI_REVIEW: ["MANAGER_REVIEW", "REJECTED"],
  MANAGER_REVIEW: ["APPROVED", "COMMITTEE_REVIEW", "REJECTED"],
  COMMITTEE_REVIEW: ["BOARD_REVIEW", "REJECTED"],
  BOARD_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["FUNDED"],
  FUNDED: ["RELEASED"],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const newStatus = body.status as ApplicationStatus
  if (!newStatus) {
    return NextResponse.json(
      { error: "status is required" },
      { status: 400 }
    )
  }
  const application = await prisma.loanApplication.findUnique({
    where: { id },
  })
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }
  const allowed = VALID_TRANSITIONS[application.status]
  if (!allowed?.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${application.status} to ${newStatus}` },
      { status: 400 }
    )
  }
  const updated = await prisma.loanApplication.update({
    where: { id },
    data: {
      status: newStatus,
      ...(newStatus === "REJECTED" && {
        rejectedAt: new Date(),
        rejectionReason: body.rejectionReason ?? "",
      }),
      ...(newStatus === "APPROVED" && { approvedAt: new Date() }),
    },
  })
  return NextResponse.json(updated)
}
