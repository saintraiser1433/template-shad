import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { LoanType } from "@prisma/client"
import { LOAN_TYPE_CONFIG, getMaxAmountForLoanType } from "@/lib/loan-config"
import { GOOD_STANDING_CBU_MIN } from "@/lib/loan-config"

const loanTypeEnum = z.enum([
  "MEMBERSHIP_LOAN",
  "MICRO_LOAN",
  "REGULAR_LOAN",
  "PRODUCTION_LOAN",
  "SHORT_TERM_LOAN",
  "LONG_TERM_LOAN",
  "EDUCATIONAL_LOAN",
])

const createApplicationSchema = z.object({
  memberId: z.string().min(1),
  loanProductId: z.string().min(1).optional(),
  loanType: loanTypeEnum.optional(),
  amount: z.number().positive(),
  termMonths: z.number().int().positive().optional(),
  termDays: z.number().int().positive().optional(),
  purpose: z.string().optional(),
}).refine(
  (data) => data.loanProductId != null || data.loanType != null,
  { message: "Either loanProductId or loanType is required", path: ["loanType"] }
)

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const memberId = searchParams.get("memberId")
  const loans = await prisma.loan.findMany({
    where: {
      ...(status ? { status: status as "ACTIVE" | "PAID" | "DELINQUENT" | "RENEWED" } : undefined),
      ...(memberId ? { memberId } : undefined),
    },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, memberNo: true, name: true } },
    },
  })
  return NextResponse.json(loans)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const parsed = createApplicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { memberId, loanProductId, loanType, amount, termMonths, termDays, purpose } =
    parsed.data

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  })
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }
  const goodStanding =
    member.isRegularMember && member.cbu >= GOOD_STANDING_CBU_MIN
  if (!goodStanding) {
    return NextResponse.json(
      { error: "Member must be in good standing (regular member with at least ₱20,000 CBU)" },
      { status: 400 }
    )
  }

  let resolvedLoanType: LoanType = "MEMBERSHIP_LOAN"
  let maxAmount: number
  let finalTermMonths: number | null = termMonths ?? null
  let finalTermDays: number | null = termDays ?? null

  if (loanProductId) {
    const product = await prisma.loanProduct.findUnique({
      where: { id: loanProductId },
    })
    if (!product) {
      return NextResponse.json({ error: "Loan product not found" }, { status: 404 })
    }
    if (product.maxCbuPercent != null && product.maxAmountFixed == null) {
      maxAmount = member.cbu * (product.maxCbuPercent / 100)
    } else if (product.maxAmountFixed != null) {
      maxAmount = product.maxAmountFixed
    } else {
      maxAmount = Number.MAX_SAFE_INTEGER
    }
    if (amount > maxAmount) {
      return NextResponse.json(
        { error: `Amount exceeds maximum of ₱${maxAmount.toLocaleString("en-PH")} for this loan type` },
        { status: 400 }
      )
    }
    if (product.termMonthsMin != null && product.termMonthsMax != null) {
      const term = termMonths ?? (termDays != null ? Math.ceil(termDays / 30) : product.termMonthsMin)
      if (term < product.termMonthsMin || term > product.termMonthsMax) {
        return NextResponse.json(
          { error: `Term must be between ${product.termMonthsMin} and ${product.termMonthsMax} months` },
          { status: 400 }
        )
      }
      finalTermMonths = term
      finalTermDays = null
    } else if (product.termDaysMin != null && product.termDaysMax != null) {
      const term = termDays ?? product.termDaysMin
      if (term < product.termDaysMin || term > product.termDaysMax) {
        return NextResponse.json(
          { error: `Term must be between ${product.termDaysMin} and ${product.termDaysMax} days` },
          { status: 400 }
        )
      }
      finalTermDays = term
      finalTermMonths = null
    }
  } else if (loanType) {
    resolvedLoanType = loanType
    const config = LOAN_TYPE_CONFIG[loanType]
    maxAmount = getMaxAmountForLoanType(loanType, member.cbu)
    if (amount > maxAmount) {
      return NextResponse.json(
        { error: `Amount exceeds maximum of ₱${maxAmount.toLocaleString("en-PH")} for this loan type` },
        { status: 400 }
      )
    }
  } else {
    return NextResponse.json(
      { error: "Either loanProductId or loanType is required" },
      { status: 400 }
    )
  }

  const appCount = await prisma.loanApplication.count()
  const applicationNo = `APP-${String(appCount + 1).padStart(5, "0")}`

  const application = await prisma.loanApplication.create({
    data: {
      applicationNo,
      memberId,
      loanType: resolvedLoanType,
      amount,
      termMonths: finalTermMonths,
      termDays: finalTermDays,
      purpose,
      status: "PENDING",
      loanProductId: loanProductId ?? undefined,
    },
  })
  return NextResponse.json(application)
}
