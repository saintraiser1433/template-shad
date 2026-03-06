import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoanTypeForm } from "../loan-type-form"

export default async function EditLoanTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "MEMBER") redirect("/dashboard")

  const { id } = await params
  const product = await prisma.loanProduct.findUnique({ where: { id } })
  if (!product) notFound()

  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex flex-1 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/loan-types">Loan types</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Edit loan type</CardTitle>
          </CardHeader>
          <CardContent>
            <LoanTypeForm
              id={product.id}
              defaultValues={{
                name: product.name,
                termMonthsMin: product.termMonthsMin ?? undefined,
                termMonthsMax: product.termMonthsMax ?? undefined,
                termDaysMin: product.termDaysMin ?? undefined,
                termDaysMax: product.termDaysMax ?? undefined,
                maxCbuPercent: product.maxCbuPercent ?? undefined,
                maxAmountFixed: product.maxAmountFixed ?? undefined,
                amortization: product.amortization,
                interestRate: product.interestRate,
                interestLabel: product.interestLabel,
                penaltyRate: product.penaltyRate,
                penaltyLabel: product.penaltyLabel,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

