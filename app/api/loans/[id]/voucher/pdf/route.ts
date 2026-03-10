import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "TREASURER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: loanId } = await params
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { member: true, voucher: true },
  })
  if (!loan || !loan.voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
  }

  const v = loan.voucher
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 24
  const contentW = pageW - margin * 2
  let y = 0

  // Header band
  doc.setFillColor(41, 57, 87) // navy
  doc.rect(0, 0, pageW, 36, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("MCFMP Cooperative", margin, 14)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("LOAN VOUCHER", pageW / 2, 26, { align: "center" })
  y = 44

  // Voucher number badge
  doc.setFillColor(240, 244, 248)
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, contentW, 12, "FD")
  doc.setTextColor(41, 57, 87)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(v.voucherNo, margin + 8, y + 8)
  y += 20

  // Content box
  const boxTop = y
  const lineHeight = 8
  const labelIndent = margin + 10
  const valueX = margin + 58

  function row(label: string, value: string) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(label, labelIndent, y + 5)
    doc.setTextColor(30, 41, 59)
    doc.setFont("helvetica", "bold")
    doc.text(value, valueX, y + 5)
    y += lineHeight
  }

  y += 10
  row("Loan No", loan.loanNo)
  row("Member", `${loan.member.name} (${loan.member.memberNo})`)
  row("Principal", loan.principalAmount.toLocaleString("en-PH"))
  row("Release method", v.releaseMethod)
  if (v.chequeNo) row("Cheque no", v.chequeNo)
  row("Released at", new Date(v.releasedAt).toLocaleString())
  y += 10

  // Draw content box border
  const boxHeight = y - boxTop
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.rect(margin, boxTop, contentW, boxHeight, "S")
  y += 20

  // Footer
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    "This voucher may be presented for payment validation.",
    pageW / 2,
    y,
    { align: "center" }
  )
  doc.text("MCFMP Cooperative — Money Lending & Management System", pageW / 2, y + 5, { align: "center" })

  const buf = Buffer.from(doc.output("arraybuffer"))
  const filename = `Voucher_${v.voucherNo}.pdf`
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  })
}
