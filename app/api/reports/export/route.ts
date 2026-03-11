import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import { formatDate } from "@/lib/date-format"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

const REPORT_TYPES = ["loans", "collections", "members"] as const
const FORMATS = ["xlsx", "pdf"] as const

type ReportType = (typeof REPORT_TYPES)[number]
type Format = (typeof FORMATS)[number]

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") as ReportType | null
  const format = searchParams.get("format") as Format | null

  if (!type || !REPORT_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Invalid type. Use: loans, collections, members" },
      { status: 400 }
    )
  }
  if (!format || !FORMATS.includes(format)) {
    return NextResponse.json(
      { error: "Invalid format. Use: xlsx, pdf" },
      { status: 400 }
    )
  }

  try {
    await createActivityLog({
      userId: session.user.id,
      action: "REPORT_EXPORTED",
      entityType: type === "loans" ? "Loan" : type === "collections" ? "Payment" : "Member",
      details: `${type} report as ${format}`,
    }).catch(() => {})

    if (type === "loans") {
      const loans = await prisma.loan.findMany({
        where: { status: { in: ["ACTIVE", "DELINQUENT"] } },
        include: { member: { select: { memberNo: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
      const rows = loans.map((l) => ({
        "Loan No": l.loanNo,
        "Member No": l.member.memberNo,
        "Member Name": l.member.name,
        "Principal": l.principalAmount,
        "Outstanding": l.outstandingBalance,
        "Status": l.status,
        "Released At": l.releasedAt ? formatDate(l.releasedAt) : "",
      }))
      if (format === "xlsx") {
        return excelResponse(rows, "Loans Report")
      }
      return pdfResponse(rows, "Loans Report")
    }

    if (type === "collections") {
      const payments = await prisma.payment.findMany({
        orderBy: { paymentDate: "desc" },
        take: 5000,
        include: {
          loan: {
            select: { loanNo: true, member: { select: { memberNo: true, name: true } } },
          },
        },
      })
      const rows = payments.map((p) => ({
        "Date": formatDate(p.paymentDate),
        "Loan No": p.loan.loanNo,
        "Member No": p.loan.member.memberNo,
        "Member Name": p.loan.member.name,
        "Amount": p.amount,
        "Principal": p.principal,
        "Interest": p.interest,
        "Penalty": p.penalty,
      }))
      if (format === "xlsx") {
        return excelResponse(rows, "Collections Report")
      }
      return pdfResponse(rows, "Collections Report")
    }

    if (type === "members") {
      const members = await prisma.member.findMany({
        orderBy: { memberNo: "asc" },
        include: { _count: { select: { loans: true } } },
      })
      const rows = members.map((m) => ({
        "Member No": m.memberNo,
        "Name": m.name,
        "Address": m.address ?? "",
        "Contact": m.contactNo ?? "",
        "CBU (₱)": m.cbu,
        "Regular Member": m.isRegularMember ? "Yes" : "No",
        "Loans Count": m._count.loans,
      }))
      if (format === "xlsx") {
        return excelResponse(rows, "Members Report")
      }
      return pdfResponse(rows, "Members Report")
    }
  } catch (e) {
    console.error("Report export error:", e)
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    )
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 })
}

function excelResponse(rows: Record<string, unknown>[], title: string) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `${title.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

function pdfResponse(rows: Record<string, unknown>[], title: string) {
  const doc = new jsPDF({ orientation: "landscape" })
  const headers = rows.length ? (Object.keys(rows[0]) as string[]) : []
  const body = rows.map((r) => headers.map((h) => String(r[h] ?? "")))
  doc.text(title, 14, 10)
  autoTable(doc, {
    head: [headers],
    body,
    theme: "grid",
    startY: 14,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [71, 85, 105] },
  })
  const buf = Buffer.from(doc.output("arraybuffer"))
  const filename = `${title.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
