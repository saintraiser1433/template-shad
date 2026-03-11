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
import { AlertTriangle } from "lucide-react"
import { LoanApplicationForm } from "./loan-application-form"
import { checkRenewalEligibility } from "@/lib/loan-calculator"

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

  // For member role, check if there is an existing loan that is not yet fully paid.
  const existingLoan =
    isMemberRole && currentMemberId
      ? await prisma.loan.findFirst({
          where: {
            memberId: currentMemberId,
            status: {
              in: ["ACTIVE", "DELINQUENT", "RENEWED"],
            },
          },
          orderBy: { createdAt: "desc" },
          select: {
            loanNo: true,
            principalAmount: true,
            outstandingBalance: true,
            status: true,
          },
        })
      : null

  const renewalEligible =
    !!existingLoan &&
    existingLoan.outstandingBalance > 0.01 &&
    checkRenewalEligibility(
      Math.max(0, existingLoan.principalAmount - existingLoan.outstandingBalance),
      existingLoan.principalAmount
    )

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
      {isMemberRole && existingLoan && !renewalEligible ? (
        <div className="flex flex-1 items-center justify-center p-4 pt-6">
          <div className="w-full max-w-2xl text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Outstanding loan in progress
                </h2>
                <p className="mt-2 text-base text-muted-foreground">
                  You currently have loan {existingLoan.loanNo} with an outstanding balance of{" "}
                  ₱{existingLoan.outstandingBalance.toLocaleString("en-PH")}. You need to pay at least{" "}
                  70% of the current loan principal (or fully pay this loan) before applying for a new one.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </DashboardLayout>
  )
}
