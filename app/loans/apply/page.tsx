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
import { LoanApplicationForm } from "./loan-application-form"

export default async function LoanApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { memberId } = await searchParams
  const isMemberRole = session.user.role === "MEMBER"

  const [membersResult, loanProducts] = await Promise.all([
    isMemberRole
      ? prisma.member.findFirst({
          where: { userId: session.user.id },
          select: { id: true, memberNo: true, name: true, cbu: true },
        }).then((m) => (m ? [m] : []))
      : prisma.member.findMany({
          orderBy: { memberNo: "asc" },
          where: {
            isRegularMember: true,
            cbu: { gte: 20000 },
          },
        }),
    prisma.loanProduct.findMany({
      orderBy: { name: "asc" },
      include: {
        requirements: {
          include: { requirement: true },
          orderBy: { requirement: { sortOrder: "asc" } },
        },
      },
    }),
  ])

  const members = Array.isArray(membersResult) ? membersResult : []
  const currentMemberId = isMemberRole && members.length === 1 ? members[0].id : undefined

  if (isMemberRole && members.length === 0) {
    redirect("/dashboard?error=member_not_linked")
  }

  const loanProductsWithReqs = loanProducts.map((p) => ({
    ...p,
    requirements: p.requirements.map((r) => ({
      id: r.requirement.id,
      name: r.requirement.name,
    })),
  }))

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
                <BreadcrumbPage>Apply for loan</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <LoanApplicationForm
          members={members.map((m) => ({
            id: m.id,
            memberNo: m.memberNo,
            name: m.name,
            cbu: m.cbu,
          }))}
          loanProducts={loanProductsWithReqs}
          defaultMemberId={currentMemberId ?? memberId ?? undefined}
          currentMemberId={currentMemberId}
        />
      </div>
    </DashboardLayout>
  )
}
