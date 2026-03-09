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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: {
      member: { select: { id: true, memberNo: true, name: true } },
    },
  })
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }
  return NextResponse.json(application)
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
  const newStatus = body.status as ApplicationStatus | undefined
  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: { member: { select: { userId: true, name: true } } },
  })
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  const updateData: {
    status?: ApplicationStatus
    rejectedAt?: Date | null
    rejectionReason?: string | null
    approvedAt?: Date | null
    characterNotes?: string | null
    capacityNotes?: string | null
    capitalNotes?: string | null
    collateralNotes?: string | null
    conditionsNotes?: string | null
    cibiPassed?: boolean | null
    collectorId?: string | null
    approvalRemarks?: string | null
  } = {}

  if (body.characterNotes !== undefined) updateData.characterNotes = body.characterNotes || null
  if (body.capacityNotes !== undefined) updateData.capacityNotes = body.capacityNotes || null
  if (body.capitalNotes !== undefined) updateData.capitalNotes = body.capitalNotes || null
  if (body.collateralNotes !== undefined) updateData.collateralNotes = body.collateralNotes || null
  if (body.conditionsNotes !== undefined) updateData.conditionsNotes = body.conditionsNotes || null
  if (body.cibiPassed !== undefined) updateData.cibiPassed = body.cibiPassed
  if (body.collectorId !== undefined) updateData.collectorId = body.collectorId || null
  if (body.approvalRemarks !== undefined) updateData.approvalRemarks = body.approvalRemarks || null

  if (newStatus) {
    const allowed = VALID_TRANSITIONS[application.status]
    if (!allowed?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${application.status} to ${newStatus}` },
        { status: 400 }
      )
    }
    updateData.status = newStatus
    if (newStatus === "REJECTED") {
      updateData.rejectedAt = new Date()
      updateData.rejectionReason = body.rejectionReason ?? ""
    }
    if (newStatus === "APPROVED") {
      updateData.approvedAt = new Date()
    }
  }

  const updated = await prisma.loanApplication.update({
    where: { id },
    data: updateData,
  })

  if (newStatus === "APPROVED" && application.member.userId) {
    await prisma.notification.create({
      data: {
        userId: application.member.userId,
        title: "Loan approved",
        message: `Your loan application ${application.applicationNo} has been approved.`,
        type: "LOAN_APPROVED",
        link: "/loans",
      },
    })
  }
  if (newStatus === "REJECTED" && application.member.userId) {
    await prisma.notification.create({
      data: {
        userId: application.member.userId,
        title: "Loan application rejected",
        message: `Your loan application ${application.applicationNo} was not approved.`,
        type: "LOAN_REJECTED",
        link: "/loans",
      },
    })
  }

  return NextResponse.json(updated)
}
