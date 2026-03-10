import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ApplicationStatus } from "@prisma/client"

const VALID_TRANSITIONS: Record<string, ApplicationStatus[]> = {
  // Allow collector to go either to CIBI_REVIEW (draft) or directly to MANAGER_REVIEW
  PENDING: ["CIBI_REVIEW", "MANAGER_REVIEW"],
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
    include: { member: { select: { userId: true, name: true, memberNo: true } } },
  })
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  const userId = session.user.id
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
    cibiApprovedById?: string | null
    managerApprovedById?: string | null
    committeeBoardApprovedById?: string | null
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
    // Set who approved at each stage
    if (newStatus === "MANAGER_REVIEW") {
      updateData.cibiApprovedById = userId
    }
    if (newStatus === "APPROVED" && application.status === "MANAGER_REVIEW") {
      updateData.managerApprovedById = userId
    }
    if (newStatus === "COMMITTEE_REVIEW" && application.status === "MANAGER_REVIEW") {
      updateData.managerApprovedById = userId
    }
    if (newStatus === "APPROVED" && (application.status === "COMMITTEE_REVIEW" || application.status === "BOARD_REVIEW")) {
      updateData.committeeBoardApprovedById = userId
    }
    if (newStatus === "BOARD_REVIEW" && application.status === "COMMITTEE_REVIEW") {
      // Manager endorsed to committee; committee/board approver set when they approve
    }
  }

  const updated = await prisma.loanApplication.update({
    where: { id },
    data: updateData,
  })

  const memberLabel =
    application.member?.name || application.member?.memberNo || "A member"

  // Notify manager when an application is submitted for manager review
  if (newStatus === "MANAGER_REVIEW") {
    const managers = await prisma.user.findMany({
      where: { role: "MANAGER", status: "ACTIVE" },
      select: { id: true },
    })
    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          title: "Loan application pending manager review",
          message: `${memberLabel} has a loan application ${application.applicationNo} pending your review.`,
          type: "PENDING_MANAGER_REVIEW",
          link: "/loans/pending",
        })),
      })
    }
  }

  // When endorsed to Credit Committee (for higher amounts), notify committee members
  if (newStatus === "COMMITTEE_REVIEW" && application.amount > 100_000) {
    const committeeMembers = await prisma.user.findMany({
      where: { role: "CREDIT_COMMITTEE", status: "ACTIVE" },
      select: { id: true },
    })
    if (committeeMembers.length > 0) {
      await prisma.notification.createMany({
        data: committeeMembers.map((u) => ({
          userId: u.id,
          title: "Loan application endorsed to Credit Committee",
          message: `${memberLabel}'s loan application ${application.applicationNo} (₱${application.amount.toLocaleString(
            "en-PH"
          )}) was endorsed for committee review.`,
          type: "PENDING_COMMITTEE_REVIEW",
          link: "/loans/pending",
        })),
      })
    }
  }

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

  // When approved (either by Manager or Credit Committee), notify Finance Officer for funding
  if (newStatus === "APPROVED") {
    const financeUsers = await prisma.user.findMany({
      where: { role: "TREASURER", status: "ACTIVE" },
      select: { id: true },
    })
    if (financeUsers.length > 0) {
      await prisma.notification.createMany({
        data: financeUsers.map((u) => ({
          userId: u.id,
          title: "Loan approved for funding",
          message: `Loan application ${application.applicationNo} has been approved and is ready for funding.`,
          type: "APPROVED_FOR_FUNDING",
          link: `/loans/${id}/voucher`,
        })),
      })
    }
  }

  return NextResponse.json(updated)
}
