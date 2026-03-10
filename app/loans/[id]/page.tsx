import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { FileText, ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
          committeeBoardApprovedBy: { select: { name: true } },
          fundedBy: { select: { name: true } },
        },
      },
      voucher: true,
      amortizationSchedule: { orderBy: { sequence: "asc" } },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 20,
        include: {
          amortizationSchedule: {
            select: { id: true, sequence: true, dueDate: true },
          },
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

  const isLoanFullyPaid =
    loan.outstandingBalance <= 0 &&
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
              <Badge
                variant={
                  displayStatus === "ACTIVE"
                    ? "default"
                    : displayStatus === "DELINQUENT"
                      ? "destructive"
                      : "secondary"
                }
              >
                {displayStatus}
              </Badge>
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
                canRecordPayment && (
                  <RecordPaymentButton
                    loanId={loan.id}
                    showLabel={isOwnLoan}
                    outstandingBalance={loan.outstandingBalance}
                    isFinanceOfficer={isFinanceOfficer}
                    disabled={isOwnLoan && hasPendingApprovalPayment}
                    disabledReason={
                      isOwnLoan && hasPendingApprovalPayment
                        ? "You already have a payment pending approval. Please wait for finance to approve or reject it before making another payment."
                        : undefined
                    }
                  />
                )}
              {canManageVoucher &&
                (loan.voucher ? (
                  <ViewVoucherModal
                    loanId={loan.id}
                    loanNo={loan.loanNo}
                    memberLabel={`${loan.member.name} (${loan.member.memberNo})`}
                    voucher={{
                      voucherNo: loan.voucher.voucherNo,
                      releaseMethod: loan.voucher.releaseMethod,
                      chequeNo: loan.voucher.chequeNo,
                      releasedAt: loan.voucher.releasedAt,
                    }}
                  />
                ) : (
                  <CreateVoucherModal loanId={loan.id} loanNo={loan.loanNo} hideReleaseMethod />
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
                  ₱{loan.member.cbu.toLocaleString("en-PH")}
                </p>
              </div>
              {totalCbuFromThisLoan > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    CBU from this loan (so far)
                  </p>
                  <p className="font-medium">
                    ₱{totalCbuFromThisLoan.toLocaleString("en-PH")}
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
                    {(
                      loan.principalAmount *
                      (loan.application.loanProduct.maxCbuPercent / 100)
                    ).toLocaleString("en-PH")}
                  </p>
                </div>
              )}
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
                  ₱{loan.principalAmount.toLocaleString("en-PH")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Outstanding balance
                </p>
                <p className="font-medium">
                  ₱{loan.outstandingBalance.toLocaleString("en-PH")}
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
                      Credit Committee / Board who approved
                    </p>
                    <p className="font-medium">
                      {loan.application.committeeBoardApprovedBy?.name ?? "—"}
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
          </CardContent>
        </Card>

        {loan.amortizationSchedule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Amortization schedule</CardTitle>
              <p className="text-sm text-muted-foreground">
                Installment breakdown by due date, principal, interest, and penalty.
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
                        const memberBlockedByOrder =
                          isOwnLoan &&
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
                                disabled={isOwnLoan && (hasPendingForRow || memberBlockedByOrder)}
                                disabledReason={
                                  isOwnLoan && hasPendingForRow
                                    ? "You already submitted a payment for this schedule that is pending approval."
                                    : isOwnLoan && memberBlockedByOrder
                                      ? "You must fully pay earlier months before paying this schedule."
                                      : undefined
                                }
                              />
                            )}
                          <SchedulePaymentsButton
                            scheduleLabel={`#${row.sequence} (${new Date(
                              row.dueDate,
                            ).toLocaleDateString("en-PH")})`}
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
                      <th className="px-3 py-1.5 text-left font-medium">Schedule</th>
                      <th className="px-3 py-1.5 text-left font-medium">CBU added</th>
                      <th className="px-3 py-1.5 text-left font-medium">Reference #</th>
                      {isFinanceOfficer && (
                        <th className="px-3 py-1.5 text-left font-medium">
                          Method
                        </th>
                      )}
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
                            {new Date(p.paymentDate).toLocaleDateString("en-PH")}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{p.amount.toLocaleString("en-PH")}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{p.principal.toLocaleString("en-PH")}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{p.interest.toLocaleString("en-PH")}
                          </td>
                          <td className="px-3 py-1.5">
                            ₱{p.penalty.toLocaleString("en-PH")}
                          </td>
                          <td className="px-3 py-1.5">
                            <div>{status}</div>
                            {status === "REJECTED" && remarks && (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                Reason: {remarks}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {sched
                              ? `#${sched.sequence} (${new Date(
                                  sched.dueDate as unknown as string,
                                ).toLocaleDateString("en-PH")})`
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5">
                            {cbuAdded > 0
                              ? `₱${cbuAdded.toLocaleString("en-PH")}`
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5">{referenceNo ?? ""}</td>
                          {isFinanceOfficer && (
                            <td className="px-3 py-1.5">
                              {paymentMethod || "CASH"}
                            </td>
                          )}
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
