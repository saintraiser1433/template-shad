import {
  GRACE_PERIOD_DAYS,
  GOOD_STANDING_CBU_MIN,
  RENEWAL_MIN_PAID_PERCENT,
} from "./loan-config"

export type AmortizationRow = {
  dueDate: Date
  principal: number
  interest: number
  totalDue: number
  sequence: number
}

/**
 * Compute amortization schedule.
 * For diminishing balance: monthly payment = P * (r(1+r)^n) / ((1+r)^n - 1), then interest = balance * r, principal = PMT - interest.
 */
export function computeAmortization(
  principal: number,
  ratePerPeriod: number,
  numberOfPeriods: number,
  amortizationType: "MONTHLY" | "DAILY" | "LUMPSUM",
  startDate: Date
): AmortizationRow[] {
  const rows: AmortizationRow[] = []
  if (amortizationType === "LUMPSUM") {
    const interest = principal * ratePerPeriod
    const endDate = new Date(startDate)
    if (numberOfPeriods >= 12) {
      endDate.setMonth(endDate.getMonth() + numberOfPeriods)
    } else {
      endDate.setDate(endDate.getDate() + numberOfPeriods)
    }
    rows.push({
      dueDate: endDate,
      principal,
      interest,
      totalDue: principal + interest,
      sequence: 1,
    })
    return rows
  }

  if (amortizationType === "DAILY") {
    const totalRepayment = principal * (1 + ratePerPeriod)
    const dailyPayment = totalRepayment / numberOfPeriods
    const principalPerDay = principal / numberOfPeriods
    const interestPerDay = (totalRepayment - principal) / numberOfPeriods
    for (let i = 0; i < numberOfPeriods; i++) {
      const dueDate = new Date(startDate)
      dueDate.setDate(dueDate.getDate() + i + 1)
      rows.push({
        dueDate,
        principal: principalPerDay,
        interest: interestPerDay,
        totalDue: dailyPayment,
        sequence: i + 1,
      })
    }
    return rows
  }

  // MONTHLY - diminishing balance
  let balance = principal
  const r = ratePerPeriod
  const n = numberOfPeriods
  const pmt =
    r > 0
      ? (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1)
      : principal / n
  for (let i = 0; i < n; i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i + 1)
    const interest = balance * r
    const principalPayment = Math.min(pmt - interest, balance)
    const totalDue = principalPayment + interest
    balance -= principalPayment
    rows.push({
      dueDate,
      principal: principalPayment,
      interest,
      totalDue,
      sequence: i + 1,
    })
  }
  return rows
}

/**
 * Compute penalty. Grace period: 7 days after due date no penalty.
 * penaltyBase: "delayed_amortization" -> 2% per month on the overdue amortization amount.
 * penaltyBase: "outstanding_after_term" -> 2% per month on outstanding balance after term ended.
 */
export function computePenalty(
  amount: number,
  dueDate: Date,
  asOfDate: Date,
  penaltyRatePerMonth: number,
  penaltyBase: "delayed_amortization" | "outstanding_after_term"
): number {
  const graceEnd = new Date(dueDate)
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS)
  if (asOfDate <= graceEnd) return 0
  const monthsLate =
    (asOfDate.getTime() - graceEnd.getTime()) / (30 * 24 * 60 * 60 * 1000)
  const fullMonths = Math.ceil(monthsLate)
  if (fullMonths <= 0) return 0
  return amount * penaltyRatePerMonth * fullMonths
}

export function checkGoodStanding(
  cbu: number,
  isRegularMember: boolean
): boolean {
  return isRegularMember && cbu >= GOOD_STANDING_CBU_MIN
}

export function checkRenewalEligibility(
  amountPaid: number,
  totalLoanAmount: number
): boolean {
  if (totalLoanAmount <= 0) return false
  const percentPaid = (amountPaid / totalLoanAmount) * 100
  return percentPaid >= RENEWAL_MIN_PAID_PERCENT
}
