import { redirect } from "next/navigation"
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
import { LoanApplicationForm } from "./loan-application-form"

export default async function LoanApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { memberId } = await searchParams
  const [members, loanProducts] = await Promise.all([
    prisma.member.findMany({
      orderBy: { memberNo: "asc" },
      where: {
        isRegularMember: true,
        cbu: { gte: 20000 },
      },
    }),
    prisma.loanProduct.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
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
                <BreadcrumbLink href="/loans">Loans</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Apply for loan</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <LoanApplicationForm
          members={members.map((m) => ({
            id: m.id,
            memberNo: m.memberNo,
            name: m.name,
            cbu: m.cbu,
          }))}
          loanProducts={loanProducts}
          defaultMemberId={memberId ?? undefined}
        />
      </div>
    </DashboardLayout>
  )
}
