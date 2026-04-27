import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { FileText, ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AmortizationTable } from "@/components/amortization-table"
import { EmptyState } from "@/components/empty-state"
import { RecordPaymentButton } from "./record-payment-button"
import { ViewPaymentDetailsButton } from "./view-payment-details"
import { CreateVoucherModal } from "./create-voucher-modal"
import { ViewVoucherModal } from "./view-voucher-modal"
import { SchedulePaymentsButton } from "./schedule-payments-button"
import { ViewPaymentReceiptButton } from "./view-payment-receipt-button"
import { formatDate } from "@/lib/date-format"
import { formatPeso } from "@/lib/money-format"

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = session.user.role
  const isFinanceOfficer = role === "TREASURER"
  const canManageVoucher = role === "TREASURER" || role === "ADMIN"

  const { id } = await params
  const sessionUserId = session.user.id
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: true,
      application: {
        include: {
          loanProduct: true,
          cibiApprovedBy: { select: { name: true } },
          managerApprovedBy: { select: { name: true } },
          committeeApprovedBy: { select: { name: true } },
          boardApprovedBy: { select: { name: true } },
          fundedBy: { select: { name: true } },
        },
      },
      voucher: true,
      voucherIssuedBy: { select: { name: true } },
      passbookIssuedBy: { select: { name: true } },
      amortizationSchedule: { orderBy: { sequence: "asc" } },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 20,
        include: {
          amortizationSchedule: {
            select: { id: true, sequence: true, dueDate: true },
          },
          approvedBy: { select: { name: true } },
        },
      },
    },
  })

  if (!loan) notFound()

  const isOwnLoan =
    role === "MEMBER" &&
    loan.member.userId != null &&
    loan.member.userId === sessionUserId
  const canRecordPayment = isFinanceOfficer || isOwnLoan

  // Use small epsilon for balance so rounding (e.g. 0.002) still counts as fully paid
  const isLoanFullyPaid =
    loan.outstandingBalance < 0.01 &&
    loan.amortizationSchedule.length > 0 &&
    loan.amortizationSchedule.every((row) => row.isPaid)

  const displayStatus =
    isLoanFullyPaid && loan.status !== "PAID" ? "PAID" : loan.status

  // Safety: if the loan is fully paid based on schedules and balance,
  // but the stored status was not updated (e.g. older logic, partial flows),
  // persist the correct PAID status so all lists and reports stay in sync.
  if (isLoanFullyPaid && loan.status !== "PAID") {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: "PAID" },
    })
  }

  // First unpaid amortization row (by sequence) – members can only pay this row.
  const earliestUnpaidScheduleId =
    loan.amortizationSchedule.find((row) => !row.isPaid)?.id ?? null

  // If there is any payment pending approval, members should wait for finance to act
  // before submitting another payment.
  const hasPendingApprovalPayment = loan.payments.some((p) => {
    const status = (p as { status?: string }).status ?? "APPROVED"
    return status === "PENDING_APPROVAL"
  })

  const paymentsByScheduleId = new Map<
    string,
    {
      id: string
      amount: number
      principal: number
      interest: number
      penalty: number
      paymentDate: Date
      status: string
      paymentMethod: string | null
      remarks: string | null
      referenceNo: string | null
      approvedByName: string | null
    }[]
  >()
  loan.payments.forEach((p) => {
    const scheduleId = p.amortizationSchedule?.id
    if (!scheduleId) return
    const status = (p as { status?: string }).status ?? "APPROVED"
    const paymentMethod =
      (p as { paymentMethod?: string | null }).paymentMethod ?? null
    const remarks = (p as { remarks?: string | null }).remarks ?? null
    const referenceNo =
      (p as { referenceNo?: string | null }).referenceNo ?? null
    const approvedByName =
      (p as { approvedBy?: { name: string } | null }).approvedBy?.name ?? null
    const arr = paymentsByScheduleId.get(scheduleId) ?? []
    arr.push({
      id: p.id,
      amount: p.amount,
      principal: p.principal,
      interest: p.interest,
      penalty: p.penalty,
      paymentDate: p.paymentDate,
      status,
      paymentMethod,
      remarks,
      referenceNo,
      approvedByName,
    })
    paymentsByScheduleId.set(scheduleId, arr)
  })

  const maxCbuPercent =
    loan.application?.loanProduct?.maxCbuPercent != null
      ? loan.application.loanProduct.maxCbuPercent
      : null
  const totalCbuRequired =
    maxCbuPercent != null
      ? loan.principalAmount * (maxCbuPercent / 100)
      : 0
  const cbuPerScheduleRow =
    totalCbuRequired > 0 && loan.amortizationSchedule.length > 0
      ? totalCbuRequired / loan.amortizationSchedule.length
      : 0

  // For display: compute how much CBU was added per payment.
  // Business rule: CBU is credited only when a schedule row becomes fully paid,
  // and a fixed CBU-per-period amount is attributed to the *last* approved payment
  // that completes it. Partial payments before that show 0 CBU.
  const cbuAddedByPaymentId = new Map<string, number>()
  for (const row of loan.amortizationSchedule) {
    const rowPayments = (paymentsByScheduleId.get(row.id) ?? []).filter(
      (p) => p.status === "APPROVED",
    )
    if (rowPayments.length === 0) continue
    // Sort by payment date ascending to find the payment that completed this row
    rowPayments.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime())
    const totalDueWithPenalty = row.totalDue + row.penalty
    let running = 0
    for (const p of rowPayments) {
      running += p.amount
      if (running >= totalDueWithPenalty - 0.01 && cbuPerScheduleRow > 0) {
        // This payment completed the schedule row: credit the fixed CBU amount
        cbuAddedByPaymentId.set(p.id, cbuPerScheduleRow)
        break
      }
    }
  }

  const totalCbuFromThisLoan = Array.from(cbuAddedByPaymentId.values()).reduce(
    (sum, v) => sum + v,
    0,
  )

  return (
    <DashboardLayout>
      <ModuleHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/loans">Loans</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{loan.loanNo}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Loan details</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={displayStatus} />
              {isOwnLoan && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <Link href="/loans">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to my loans
                  </Link>
                </Button>
              )}
              {(displayStatus === "ACTIVE" || displayStatus === "DELINQUENT") &&
                !isLoanFullyPaid &&
                canRecordPayment &&
                // Members should only pay via the amortization schedule rows (not the header button).
                !isOwnLoan && (
                  <RecordPaymentButton
                    loanId={loan.id}
                    showLabel={false}
                    outstandingBalance={loan.outstandingBalance}
                    isFinanceOfficer={isFinanceOfficer}
                  />
                )}
              {(canManageVoucher || isOwnLoan) &&
                (loan.voucher ? (
                  <ViewVoucherModal
                    loanId={loan.id}
                    loanNo={loan.loanNo}
                    memberLabel={`${loan.member.name} (${loan.member.memberNo})`}
                    buttonLabel={isOwnLoan ? "Check voucher" : undefined}
                    renewal={
                      loan.renewalDeducted > 0.01
                        ? {
                            requestedAmount: loan.principalAmount + loan.renewalDeducted,
                            deducted: loan.renewalDeducted,
                            reason:
                              "This is a loan renewal. The remaining balance from your previous loan was deducted.",
                          }
                        : undefined
                    }
                    voucher={{
                      voucherNo: loan.voucher.voucherNo,
                      releaseMethod: loan.voucher.releaseMethod,
                      chequeNo: loan.voucher.chequeNo,
                      releasedAt: loan.voucher.releasedAt,
                    }}
                  />
                ) : (
                  canManageVoucher && (
                    <CreateVoucherModal loanId={loan.id} loanNo={loan.loanNo} hideReleaseMethod />
                  )
                ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Loan number
                </p>
                <p className="font-medium">{loan.loanNo}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Member
                </p>
                <p className="font-medium">
                  <Link
                    href={`/members/${loan.memberId}`}
                    className="underline hover:no-underline"
                  >
                    {loan.member.name} ({loan.member.memberNo})
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Member CBU
                </p>
                <p className="font-medium">
                  ₱{formatPeso(loan.member.cbu)}
                </p>
              </div>
              {totalCbuFromThisLoan > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    CBU from this loan (so far)
                  </p>
                  <p className="font-medium">
                    ₱{formatPeso(totalCbuFromThisLoan)}
                  </p>
                </div>
              )}
              {loan.application?.loanProduct?.maxCbuPercent != null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    CBU requirement (% of loan)
                  </p>
                  <p className="font-medium">
                    {loan.application.loanProduct.maxCbuPercent}%
                  </p>
                </div>
              )}
              {loan.application?.loanProduct?.maxCbuPercent != null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Required CBU
                  </p>
                  <p className="font-medium">
                    ₱
                    {formatPeso(
                      loan.principalAmount *
                        (loan.application.loanProduct.maxCbuPercent / 100)
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Voucher issued
                </p>
                <p className="font-medium">
                  {loan.voucherIssuedAt
                    ? `${formatDate(loan.voucherIssuedAt)} · ${
                        loan.voucherIssuedBy?.name ?? "—"
                      }`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Passbook issued
                </p>
                <p className="font-medium">
                  {loan.passbookIssuedAt
                    ? `${formatDate(loan.passbookIssuedAt)} · ${
                        loan.passbookIssuedBy?.name ?? "—"
                      }`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="font-medium">
                  {loan.loanType.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Principal
                </p>
                <p className="font-medium">
                  ₱{formatPeso(loan.principalAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Outstanding balance
                </p>
                <p className="font-medium">
                  ₱{formatPeso(loan.outstandingBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Interest rate
                </p>
                <p className="font-medium">
                  {(loan.interestRate * 100).toFixed(2)}% per period
                </p>
              </div>
              {loan.application && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      CI/BI who approved
                    </p>
                    <p className="font-medium">
                      {loan.application.cibiApprovedBy?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Manager who approved
                    </p>
                    <p className="font-medium">
                      {loan.application.managerApprovedBy?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Committee who approved
                    </p>
                    <p className="font-medium">
                      {loan.application.committeeApprovedBy?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Board who approved
                    </p>
                    <p className="font-medium">
                      {loan.application.boardApprovedBy?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Finance Officer who approved
                    </p>
                    <p className="font-medium">
                      {loan.application.fundedBy?.name ?? "—"}
                    </p>
                  </div>
                </>
              )}
            </div>
            {isOwnLoan && (
              <p className="text-sm text-muted-foreground">
                Bring your <span className="font-medium">loan voucher</span> and{" "}
                <span className="font-medium">passbook</span> when paying in the
                office for payment validation.
              </p>
            )}
          </CardContent>
        </Card>

        {loan.amortizationSchedule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Amortization schedule</CardTitle>
              <p className="text-sm text-muted-foreground">
                <span className="block">
                  <span className="font-medium text-foreground">Total due</span> is the full
                  installment: principal + interest (and any penalty if late). The two
                  parts do not have to be the same number; for current monthly loans the
                  schedule uses a <span className="font-medium">flat (add-on)</span> split
                  with the same principal and the same interest every month.
                </span>
              </p>
            </CardHeader>
            <CardContent>
              <AmortizationTable
                schedule={loan.amortizationSchedule.map((row) => ({
                  ...row,
                  cbuPerPeriod: cbuPerScheduleRow > 0 ? cbuPerScheduleRow : undefined,
                }))}
                renderAction={
                  canRecordPayment
                    ? (row) => {
                        const rowPayments = paymentsByScheduleId.get(row.id) ?? []
                        const hasPendingForRow = rowPayments.some(
                          (p) => p.status === "PENDING_APPROVAL",
                        )
                        const blockedByOrder =
                          earliestUnpaidScheduleId != null &&
                          !row.isPaid &&
                          row.id !== earliestUnpaidScheduleId
                        return (
                          <div className="flex justify-end gap-1">
                            {canRecordPayment && !row.isPaid && (
                              <RecordPaymentButton
                                loanId={loan.id}
                                showLabel
                                scheduleRow={{
                                  totalDue: row.totalDue,
                                  penalty: row.penalty,
                                  remainingDue: Math.max(
                                    0,
                                    row.totalDue + row.penalty - (row.paidAmount ?? 0),
                                  ),
                                }}
                                outstandingBalance={loan.outstandingBalance}
                                isFinanceOfficer={isFinanceOfficer}
                                scheduleRowId={row.id}
                                disabled={hasPendingForRow || blockedByOrder}
                                disabledReason={
                                  hasPendingForRow
                                    ? "There is already a payment for this schedule pending approval."
                                    : blockedByOrder
                                      ? "You must fully pay earlier months before paying this schedule."
                                      : undefined
                                }
                              />
                            )}
                          <SchedulePaymentsButton
                            scheduleLabel={`#${row.sequence} (${formatDate(row.dueDate)})`}
                            payments={(paymentsByScheduleId.get(row.id) ?? []).map(
                              (p) => ({
                                id: p.id,
                                amount: p.amount,
                                principal: p.principal,
                                interest: p.interest,
                                penalty: p.penalty,
                                paymentDate: p.paymentDate.toISOString(),
                                status: p.status,
                                paymentMethod: p.paymentMethod,
                                remarks: p.remarks,
                                referenceNo: p.referenceNo,
                                cbuAdded: cbuAddedByPaymentId.get(p.id) ?? 0,
                                approvedByName: p.approvedByName,
                              }),
                            )}
                            loanId={loan.id}
                            isFinanceOfficer={isFinanceOfficer}
                          />
                          </div>
                        )
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <p className="text-sm text-muted-foreground">
              Payments applied to this loan (principal, interest, penalty).
            </p>
          </CardHeader>
          <CardContent>
            {loan.payments.length === 0 ? (
              <div className="py-10">
                <EmptyState title="No payments yet" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-1.5 text-left font-medium">Date</th>
                      <th className="px-3 py-1.5 text-left font-medium">Amount</th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Principal
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Interest
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Penalty
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium">Status</th>
                      <th className="px-3 py-1.5 text-left font-medium">Approved by</th>
                      <th className="px-3 py-1.5 text-left font-medium">Schedule</th>
                      <th className="px-3 py-1.5 text-left font-medium">CBU added</th>
                      <th className="px-3 py-1.5 text-left font-medium">Reference #</th>
                      <th className="px-3 py-1.5 text-left font-medium">Receipt</th>
                      <th className="px-3 py-1.5 text-left font-medium">
                        Mode of payment
                      </th>
                      {isFinanceOfficer && (
                        <th className="px-3 py-1.5 text-right font-medium">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loan.payments.map((p) => {
                      const status = (p as { status?: string }).status ?? "APPROVED"
                      const paymentMethod = (p as { paymentMethod?: string | null }).paymentMethod ?? "CASH"
                      const sched = (p as { amortizationSchedule?: { sequence?: number; dueDate?: Date } | null }).amortizationSchedule
                      const remarks =
                        (p as { remarks?: string | null }).remarks ?? null
                      const referenceNo =
                        (p as { referenceNo?: string | null }).referenceNo ?? null
                      const cbuAdded = cbuAddedByPaymentId.get(p.id) ?? 0
                      const showViewDetails =
                        isFinanceOfficer &&
                        status === "PENDING_APPROVAL" &&
                        paymentMethod &&
                        paymentMethod.toUpperCase() !== "CASH"
                      return (
                        <tr
                          key={p.id}
                          className="border-b transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-1.5">
                            {formatDate(p.paymentDate)}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{formatPeso(p.amount)}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{formatPeso(p.principal)}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{formatPeso(p.interest)}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{formatPeso(p.penalty)}
                          </td>
                          <td className="px-3 py-1.5">
                            <div>
                              <StatusBadge status={status} />
                              {status === "REJECTED" && remarks && (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                Reason: {remarks}
                              </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {status === "APPROVED"
                              ? (p as { approvedBy?: { name: string } | null }).approvedBy?.name ?? "—"
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5">
                            {sched
                              ? `#${sched.sequence} (${formatDate(sched.dueDate as unknown as string)})`
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5">
                            {cbuAdded > 0
                              ? `₱${formatPeso(cbuAdded)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5">{referenceNo ?? ""}</td>
                          <td className="px-3 py-1.5">
                            {status === "APPROVED" ? (
                              <ViewPaymentReceiptButton
                                loanId={loan.id}
                                paymentId={p.id}
                                size="icon-sm"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {paymentMethod || "CASH"}
                          </td>
                          {isFinanceOfficer && (
                            <td className="px-3 py-1.5 text-right">
                              {showViewDetails ? (
                                <ViewPaymentDetailsButton
                                  loanId={loan.id}
                                  payment={{
                                    id: p.id,
                                    amount: p.amount,
                                    principal: p.principal,
                                    interest: p.interest,
                                    penalty: p.penalty,
                                    paymentDate: p.paymentDate.toISOString(),
                                    paymentMethod: paymentMethod || null,
                                    status,
                                  }}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
