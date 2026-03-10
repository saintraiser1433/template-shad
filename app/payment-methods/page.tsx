import { redirect } from "next/navigation"
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
import { PaymentMethodsTable } from "./payment-methods-table"

export default async function PaymentMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { search } = await searchParams
  const q = search?.trim().toLowerCase()
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: q
      ? {
          OR: [
            { accountName: { contains: q, mode: "insensitive" } },
            { accountNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  })

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
                <BreadcrumbPage>Payment methods</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Payment methods</h1>
          <p className="text-sm text-muted-foreground">
            Manage payment channels: account name, account number, type (BPI, GCash, Other), and status.
          </p>
        </div>
        <PaymentMethodsTable
          paymentMethods={paymentMethods}
          defaultSearch={search}
        />
      </div>
    </DashboardLayout>
  )
}
