import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { VoucherForm } from "./voucher-form"

export default async function LoanVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id: loanId } = await params
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      member: true,
      voucher: true,
    },
  })
  if (!loan) notFound()

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
                <BreadcrumbLink href={`/loans/${loanId}`}>{loan.loanNo}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Voucher</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        addButton={
          <Button variant="action" size="sm" asChild>
            <Link href={`/loans/${loanId}`}>Back to loan</Link>
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        {loan.voucher ? (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Loan voucher — {loan.voucher.voucherNo}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {loan.loanNo} · {loan.member.name} ({loan.member.memberNo})
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm">
                <p><span className="font-medium text-muted-foreground">Release method:</span> {loan.voucher.releaseMethod}</p>
                {loan.voucher.chequeNo && (
                  <p><span className="font-medium text-muted-foreground">Cheque no:</span> {loan.voucher.chequeNo}</p>
                )}
                <p><span className="font-medium text-muted-foreground">Released at:</span> {new Date(loan.voucher.releasedAt).toLocaleString()}</p>
              </div>
              <Button variant="action" size="icon-sm" asChild title="Print voucher">
                <Link href={`/loans/${loanId}/voucher/print`} target="_blank" rel="noopener noreferrer">
                  <Printer className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <VoucherForm loanId={loan.id} loanNo={loan.loanNo} />
        )}
      </div>
    </DashboardLayout>
  )
}
