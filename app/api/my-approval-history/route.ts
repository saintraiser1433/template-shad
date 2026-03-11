import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const APPROVAL_ACTIONS = [
  "APP_CIBI_APPROVED",
  "APP_CIBI_REJECTED",
  "APP_MANAGER_APPROVED",
  "APP_MANAGER_REJECTED",
  "APP_MANAGER_ENDORSED",
  "APP_COMMITTEE_ENDORSED",
  "APP_COMMITTEE_REJECTED",
  "APP_BOARD_APPROVED",
  "APP_BOARD_REJECTED",
  "APP_FUNDED",
  "APP_RELEASED",
]

/** Collector: submit to manager (CI/BI passed) or CI/BI rejected */
const COLLECTOR_SUBMISSION_ACTIONS = ["APP_CIBI_APPROVED", "APP_CIBI_REJECTED"]
/** Manager: approve, reject, or endorse to committee */
const MANAGER_ACTIONS = ["APP_MANAGER_APPROVED", "APP_MANAGER_REJECTED", "APP_MANAGER_ENDORSED"]
/** Credit committee: endorse to board or reject */
const COMMITTEE_ACTIONS = ["APP_COMMITTEE_ENDORSED", "APP_COMMITTEE_REJECTED"]
/** Board of directors: approve or reject */
const BOARD_ACTIONS = ["APP_BOARD_APPROVED", "APP_BOARD_REJECTED"]
/** Finance: funded, released */
const FINANCE_ACTIONS = ["APP_FUNDED", "APP_RELEASED"]

const HISTORY_TYPE_ACTIONS: Record<string, string[]> = {
  collector_submissions: COLLECTOR_SUBMISSION_ACTIONS,
  manager: MANAGER_ACTIONS,
  committee: COMMITTEE_ACTIONS,
  board: BOARD_ACTIONS,
  finance: FINANCE_ACTIONS,
}

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const type = searchParams.get("type") ?? ""

  const actions = HISTORY_TYPE_ACTIONS[type] ?? APPROVAL_ACTIONS

  const where = {
    userId: session.user.id,
    action: { in: actions },
    entityType: "LoanApplication",
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
  })
}
