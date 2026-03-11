const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
]

/**
 * Format a date as DD-MMM-YYYY (e.g. 01-JAN-2026).
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, "0")
  const month = MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}
