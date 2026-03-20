import type { LoanType } from "@prisma/client"

export const GRACE_PERIOD_DAYS = 7
export const GOOD_STANDING_CBU_MIN = 20_000 // 20k PHP
export const MANAGER_APPROVAL_LIMIT = 100_000 // 100k PHP
export const RENEWAL_MIN_PAID_PERCENT = 70

export const AMORTIZATION_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "DAILY", label: "Daily" },
  { value: "LUMPSUM", label: "Lump sum" },
] as const

export type AmortizationOptionValue = (typeof AMORTIZATION_OPTIONS)[number]["value"]

export type LoanTypeConfig = {
  label: string
  termMonthsMin: number
  termMonthsMax: number | null
  termDaysMin?: number
  termDaysMax?: number
  maxAmount: number | ((cbu: number) => number) // fixed or 80% of CBU
  interestRate: number // per month or per term as decimal (e.g. 0.03 = 3%)
  interestPeriod: "month" | "term" | "year"
  amortization: AmortizationOptionValue
  penaltyRate: number // 2% = 0.02 per month
  penaltyBase: "delayed_amortization" | "outstanding_after_term"
}

export const LOAN_TYPE_CONFIG: Record<LoanType, LoanTypeConfig> = {
  MEMBERSHIP_LOAN: {
    label: "Membership Loan",
    termMonthsMin: 1,
    termMonthsMax: 10,
    maxAmount: (cbu) => cbu * 0.8,
    interestRate: 0.03,
    interestPeriod: "month",
    amortization: "MONTHLY",
    penaltyRate: 0.02,
    penaltyBase: "delayed_amortization",
  },
  MICRO_LOAN: {
    label: "Micro Loan",
    termMonthsMin: 0,
    termMonthsMax: 0,
    termDaysMin: 45,
    termDaysMax: 50,
    maxAmount: 10_000,
    interestRate: 0.05,
    interestPeriod: "term",
    amortization: "DAILY",
    penaltyRate: 0.02,
    penaltyBase: "outstanding_after_term",
  },
  REGULAR_LOAN: {
    label: "Regular Loan",
    termMonthsMin: 1,
    termMonthsMax: 10,
    maxAmount: (cbu) => cbu * 0.8,
    interestRate: 0.03,
    interestPeriod: "month",
    amortization: "MONTHLY",
    penaltyRate: 0.02,
    penaltyBase: "delayed_amortization",
  },
  PRODUCTION_LOAN: {
    label: "Production Loan",
    termMonthsMin: 3,
    termMonthsMax: 3,
    maxAmount: 30_000,
    interestRate: 0.10,
    interestPeriod: "term",
    amortization: "LUMPSUM",
    penaltyRate: 0.02,
    penaltyBase: "outstanding_after_term",
  },
  SHORT_TERM_LOAN: {
    label: "Short Term Loan (STL)",
    termMonthsMin: 12,
    termMonthsMax: 12,
    maxAmount: (cbu) => cbu * 0.8,
    interestRate: 0.18 / 12,
    interestPeriod: "month",
    amortization: "MONTHLY",
    penaltyRate: 0.02,
    penaltyBase: "delayed_amortization",
  },
  LONG_TERM_LOAN: {
    label: "Long Term Loan",
    termMonthsMin: 24,
    termMonthsMax: null,
    maxAmount: 500_000,
    interestRate: 0.15 / 12,
    interestPeriod: "month",
    amortization: "MONTHLY",
    penaltyRate: 0.02,
    penaltyBase: "delayed_amortization",
  },
  EDUCATIONAL_LOAN: {
    label: "Educational Loan",
    termMonthsMin: 5,
    termMonthsMax: 5,
    maxAmount: 10_000,
    interestRate: 0,
    interestPeriod: "term",
    amortization: "LUMPSUM",
    penaltyRate: 0.02,
    penaltyBase: "outstanding_after_term",
  },
}

export function getMaxAmountForLoanType(loanType: LoanType, memberCbu: number): number {
  const config = LOAN_TYPE_CONFIG[loanType]
  if (typeof config.maxAmount === "function") {
    return Math.min(config.maxAmount(memberCbu), loanType === "LONG_TERM_LOAN" ? 500_000 : Infinity)
  }
  return config.maxAmount as number
}
