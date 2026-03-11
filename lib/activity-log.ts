import { prisma } from "@/lib/prisma"

export type ActivityAction =
  | "LOGIN"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DEACTIVATED"
  | "USER_ACTIVATED"
  | "MEMBER_CREATED"
  | "MEMBER_UPDATED"
  | "LOAN_TYPE_CREATED"
  | "LOAN_TYPE_UPDATED"
  | "LOAN_TYPE_DELETED"
  | "REQUIREMENT_CREATED"
  | "REQUIREMENT_UPDATED"
  | "REQUIREMENT_DELETED"
  | "APPLICATION_STATUS_CHANGED"
  | "APP_CIBI_APPROVED"
  | "APP_CIBI_REJECTED"
  | "APP_MANAGER_APPROVED"
  | "APP_MANAGER_REJECTED"
  | "APP_MANAGER_ENDORSED"
  | "APP_COMMITTEE_ENDORSED"
  | "APP_COMMITTEE_REJECTED"
  | "APP_BOARD_APPROVED"
  | "APP_BOARD_REJECTED"
  | "APP_FUNDED"
  | "APP_RELEASED"
  | "LOAN_CREATED"
  | "LOAN_FUNDED"
  | "LOAN_RELEASED"
  | "PAYMENT_RECORDED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "VOUCHER_CREATED"
  | "REPORT_EXPORTED"

export async function createActivityLog({
  userId,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ip = null,
  userAgent = null,
}: {
  userId: string | null
  action: ActivityAction | string
  entityType?: string | null
  entityId?: string | null
  details?: string | null
  ip?: string | null
  userAgent?: string | null
}) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      details,
      ip,
      userAgent,
    },
  })
}
