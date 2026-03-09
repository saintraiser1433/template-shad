export type LoanTypeOption = {
  id: string
  name: string
  termMonthsMin: number | null
  termMonthsMax: number | null
  termDaysMin: number | null
  termDaysMax: number | null
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
  if (p.termMonthsMin != null && p.termMonthsMax != null) {
    return p.termMonthsMin === p.termMonthsMax
      ? `${p.termMonthsMin} month${p.termMonthsMin > 1 ? "s" : ""}`
      : `${p.termMonthsMin} to ${p.termMonthsMax} months`
  }
  if (p.termMonthsMin != null && p.termMonthsMax == null) return `${p.termMonthsMin}+ months`
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
