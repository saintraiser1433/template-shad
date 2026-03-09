import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * DELETE /api/admin/delete-all-loans
 * Removes all loans and related data (payments, amortization schedules, vouchers,
 * loan applications, and their documents). Admin only.
 */
export async function DELETE() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany()
      await tx.amortizationSchedule.deleteMany()
      await tx.loanVoucher.deleteMany()
      await tx.loan.deleteMany()
      await tx.document.deleteMany({ where: { applicationId: { not: null } } })
      await tx.loanApplication.deleteMany()
    })
    return NextResponse.json({ success: true, message: "All loans and related data removed." })
  } catch (e) {
    console.error("Delete all loans error:", e)
    return NextResponse.json(
      { error: "Failed to delete loans" },
      { status: 500 }
    )
  }
}
