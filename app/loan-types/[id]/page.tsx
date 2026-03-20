import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
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
  const product = await prisma.loanProduct.findUnique({
    where: { id },
    include: {
      requirements: {
        include: { requirement: true },
        orderBy: { requirement: { sortOrder: "asc" } },
      },
    },
  })
  if (!product) notFound()

  const requirements = await prisma.requirement.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  })
  const defaultRequirementIds = product.requirements.map((r) => r.requirement.id)

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
                <BreadcrumbLink href="/loan-types">Loan types</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit loan type</CardTitle>
          </CardHeader>
          <CardContent>
            <LoanTypeForm
              id={product.id}
              requirements={requirements}
              defaultRequirementIds={defaultRequirementIds}
              defaultValues={{
                name: product.name,
                termMonthsMin: product.termMonthsMin ?? undefined,
                termMonthsMax: product.termMonthsMax ?? undefined,
                termDaysMin: product.termDaysMin ?? undefined,
                termDaysMax: product.termDaysMax ?? undefined,
                // Prisma client types update after `prisma generate`.
                requiresGoodStanding: (product as unknown as { requiresGoodStanding?: boolean }).requiresGoodStanding ?? true,
                maxCbuPercent: product.maxCbuPercent ?? undefined,
                maxAmountFixed: product.maxAmountFixed ?? undefined,
                amortization: product.amortization as unknown as "MONTHLY" | "DAILY" | "LUMPSUM",
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

