export type LoanTypeOption = {
  id: string
  name: string
  termMonthsMin: number | null
  termMonthsMax: number | null
  termDaysMin: number | null
  termDaysMax: number | null
  requiresGoodStanding?: boolean | null
  maxCbuPercent: number | null
  maxAmountFixed: number | null
  amortization: string
  interestRate: number
  interestLabel: string
  penaltyRate: number
  penaltyLabel: string
  requirements?: { id: string; name: string }[]
}

export function formatTerm(p: LoanTypeOption): string {
  const amort = String(p.amortization ?? "").trim().toUpperCase()
  const preferDays = amort === "DAILY"
  if (!preferDays && p.termMonthsMin != null && p.termMonthsMax != null) {
    if (p.termMonthsMin <= 0 && p.termMonthsMax <= 0) {
      // treat 0–0 months as unset (so days can be shown)
    } else {
    return p.termMonthsMin === p.termMonthsMax
      ? `${p.termMonthsMin} month${p.termMonthsMin > 1 ? "s" : ""}`
      : `${p.termMonthsMin} to ${p.termMonthsMax} months`
    }
  }
  if (!preferDays && p.termMonthsMin != null && p.termMonthsMax == null) {
    if (p.termMonthsMin > 0) return `${p.termMonthsMin}+ months`
  }
  if (p.termDaysMin != null && p.termDaysMax != null) {
    return p.termDaysMin === p.termDaysMax
      ? `${p.termDaysMin} days`
      : `${p.termDaysMin} to ${p.termDaysMax} days`
  }
  return "-"
}

export function formatMaxAmount(p: LoanTypeOption): string {
  if (p.maxAmountFixed != null)
    return `₱${p.maxAmountFixed.toLocaleString("en-PH")}`
  return "-"
}

export function formatCbuRequirement(p: LoanTypeOption): string {
  if (p.maxCbuPercent != null) return `CBU ${p.maxCbuPercent}% of loan`
  return "CBU -"
}
