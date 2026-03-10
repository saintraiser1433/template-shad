import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function LoanVoucherPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "TREASURER") redirect("/dashboard")

  const { id: loanId } = await params
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      member: true,
      voucher: true,
    },
  })
  if (!loan || !loan.voucher) notFound()

  const v = loan.voucher
  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-8">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-center text-xl font-bold">LOAN VOUCHER</h1>
        <div className="border border-black p-4 space-y-2 text-sm">
          <p><strong>Voucher no:</strong> {v.voucherNo}</p>
          <p><strong>Loan no:</strong> {loan.loanNo}</p>
          <p><strong>Member:</strong> {loan.member.name} ({loan.member.memberNo})</p>
          <p><strong>Principal:</strong> ₱{loan.principalAmount.toLocaleString("en-PH")}</p>
          <p><strong>Release method:</strong> {v.releaseMethod}</p>
          {v.chequeNo && <p><strong>Cheque no:</strong> {v.chequeNo}</p>}
          <p><strong>Released at:</strong> {new Date(v.releasedAt).toLocaleString()}</p>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          This voucher may be presented for payment validation. MCFMP Cooperative.
        </p>
      </div>
    </div>
  )
}
