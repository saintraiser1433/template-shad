import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/date-format"
import { jsPDF } from "jspdf"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: loanId } = await params
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      member: true,
      voucher: true,
      voucherIssuedBy: { select: { name: true } },
    },
  })
  if (!loan || !loan.voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
  }

  // Access control:
  // - Finance/Admin can view any voucher
  // - Members can only view vouchers for their own loans
  const role = session.user.role
  const financeRoles = ["TREASURER", "LOANS_CLERK", "DISBURSING_STAFF", "CASHIER"]
  const canViewAny = role === "ADMIN" || financeRoles.includes(role)
  const isOwnMemberLoan =
    role === "MEMBER" &&
    loan.member.userId != null &&
    loan.member.userId === session.user.id
  if (!canViewAny && !isOwnMemberLoan) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const v = loan.voucher
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 24

  // Title: "Check Voucher"
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(0, 0, 0)
  doc.text("Check Voucher", pageW / 2, y, { align: "center" })
  y += 8

  // Subtitle
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Payment Voucher", pageW / 2, y, { align: "center" })
  y += 12

  // Header fields (Check / Voucher info)
  doc.setFontSize(9)
  doc.text(`Voucher No.: ${v.voucherNo}`, margin, y)
  doc.text(`Check No.: ${v.chequeNo ?? "________________"}`, margin + contentW / 2, y)
  y += 6
  doc.text(`Date: ${formatDate(v.releasedAt)}`, margin, y)
  y += 8

  // Pay to
  doc.text("Pay To:", margin, y)
  doc.text(
    `${loan.member.name} (${loan.member.memberNo})`,
    margin + 24,
    y
  )
  y += 10

  // Table header: Description | Amount
  const tableLeft = margin
  const descWidth = contentW * 0.65
  const amtWidth = contentW - descWidth
  const headerHeight = 8

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)

  // Header row box
  doc.rect(tableLeft, y, descWidth, headerHeight)
  doc.rect(tableLeft + descWidth, y, amtWidth, headerHeight)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Description", tableLeft + 2, y + 5)
  doc.text("Amount", tableLeft + descWidth + 2, y + 5)
  y += headerHeight

  // First data row: loan release
  const rowHeight = 8
  const netAmount = loan.principalAmount
  const isRenewal = loan.renewalDeducted && loan.renewalDeducted > 0.01
  const requested = isRenewal ? loan.principalAmount + (loan.renewalDeducted ?? 0) : netAmount

  doc.setFont("helvetica", "normal")
  doc.rect(tableLeft, y, descWidth, rowHeight)
  doc.rect(tableLeft + descWidth, y, amtWidth, rowHeight)
  doc.text(`Loan ${loan.loanNo} release`, tableLeft + 2, y + 5)
  doc.text(
    netAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 }),
    tableLeft + descWidth + amtWidth - 2,
    y + 5,
    { align: "right" }
  )
  y += rowHeight

  // Optional renewal breakdown row
  if (isRenewal) {
    doc.rect(tableLeft, y, descWidth, rowHeight)
    doc.rect(tableLeft + descWidth, y, amtWidth, rowHeight)
    doc.text(
      `Less: renewal balance`,
      tableLeft + 2,
      y + 5
    )
    doc.text(
      (loan.renewalDeducted ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
      }),
      tableLeft + descWidth + amtWidth - 2,
      y + 5,
      { align: "right" }
    )
    y += rowHeight
  }

  // A few empty rows
  for (let i = 0; i < 5; i++) {
    doc.rect(tableLeft, y, descWidth, rowHeight)
    doc.rect(tableLeft + descWidth, y, amtWidth, rowHeight)
    y += rowHeight
  }

  y += 10

  // The sum of ...
  doc.setFontSize(9)
  doc.text(
    `The sum of ${netAmount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
    })}.`,
    margin,
    y
  )
  y += 8
  doc.text("Payment made in ________________________________", margin, y)
  y += 16

  // Signatures
  const sigY = y + 16
  const midX = pageW / 2
  const lineWidth = 50

  // Payment Received By
  const receivedByName = loan.member.name ?? ""
  if (receivedByName) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text(receivedByName, margin, sigY - 2)
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.line(margin, sigY, margin + lineWidth, sigY)
  doc.text("Payment Received BY", margin, sigY + 5)

  // Payment Approved By
  const approvedByName =
    loan.voucherIssuedBy?.name ?? session.user.name ?? ""
  if (approvedByName) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text(approvedByName, midX + 10, sigY - 2)
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.line(midX + 10, sigY, midX + 10 + lineWidth, sigY)
  doc.text("Payment Approved BY", midX + 10, sigY + 5)

  const buf = Buffer.from(doc.output("arraybuffer"))
  const filename = `Voucher_${v.voucherNo}.pdf`
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  })
}
