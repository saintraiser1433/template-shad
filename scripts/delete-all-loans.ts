/**
 * Script to remove all loans and related data from the database.
 * Run: npm run delete-all-loans
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const payments = await tx.payment.deleteMany()
    const schedules = await tx.amortizationSchedule.deleteMany()
    const vouchers = await tx.loanVoucher.deleteMany()
    const loans = await tx.loan.deleteMany()
    const docs = await tx.document.deleteMany({ where: { applicationId: { not: null } } })
    const applications = await tx.loanApplication.deleteMany()

    return { payments, schedules, vouchers, loans, docs, applications }
  })

  console.log("Deleted:")
  console.log("  Payments:", result.payments.count)
  console.log("  Amortization schedules:", result.schedules.count)
  console.log("  Loan vouchers:", result.vouchers.count)
  console.log("  Loans:", result.loans.count)
  console.log("  Documents (loan applications):", result.docs.count)
  console.log("  Loan applications:", result.applications.count)
  console.log("\nAll loans and related data have been removed.")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
