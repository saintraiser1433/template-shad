import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSms } from "@/lib/sms"
import { formatDate } from "@/lib/date-format"
import { GRACE_PERIOD_DAYS } from "@/lib/loan-config"

/**
 * Cron endpoint: send SMS reminders for amortization due within the 7-day grace period.
 * Call daily (e.g. via Vercel Cron or system cron). Optional auth via CRON_SECRET.
 *
 * Example: GET /api/cron/grace-period-reminders
 * Header: Authorization: Bearer <CRON_SECRET> (if CRON_SECRET is set)
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    const token = auth?.replace(/^Bearer\s+/i, "").trim()
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const graceEnd = new Date(today)
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS)

  // Schedules with due date in the past but still within grace (due <= today <= due+7), not paid
  const schedules = await prisma.amortizationSchedule.findMany({
    where: {
      isPaid: false,
      dueDate: {
        gte: new Date(today.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000),
        lte: today,
      },
    },
    include: {
      loan: {
        select: {
          loanNo: true,
          status: true,
          member: { select: { contactNo: true } },
        },
      },
    },
  })

  // Only for active/delinquent loans
  const active = schedules.filter(
    (s) => s.loan.status === "ACTIVE" || s.loan.status === "DELINQUENT"
  )

  const results: { loanNo: string; dueDate: string; sent: boolean; error?: string }[] = []

  for (const row of active) {
    const dueDateStr = formatDate(row.dueDate)
    const message = `MCFMP: Reminder – your loan ${row.loan.loanNo} amortization due on ${dueDateStr} is still unpaid. Please pay within the 7-day grace period to avoid penalties.`
    const result = await sendSms(row.loan.member?.contactNo ?? null, message)
    results.push({
      loanNo: row.loan.loanNo,
      dueDate: dueDateStr,
      sent: result.ok,
      error: result.ok ? undefined : result.error,
    })
  }

  return NextResponse.json({
    ok: true,
    remindersSent: results.filter((r) => r.sent).length,
    remindersFailed: results.filter((r) => !r.sent).length,
    results,
  })
}
