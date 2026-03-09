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
  | "LOAN_CREATED"
  | "LOAN_FUNDED"
  | "LOAN_RELEASED"
  | "PAYMENT_RECORDED"
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
