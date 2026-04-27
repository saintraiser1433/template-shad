/** Philippine peso display: always 2 decimal places (banking-style). */
export function formatPeso(amount: number): string {
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
