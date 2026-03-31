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
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

  // For member role, check if there is an existing loan with an outstanding balance (only those block new applications).
  // PAID and RENEWED loans with P0 balance do not block.
  const existingLoan =
    isMemberRole && currentMemberId
      ? await prisma.loan.findFirst({
          where: {
            memberId: currentMemberId,
            status: { in: ["ACTIVE", "DELINQUENT", "RENEWED"] },
            outstandingBalance: { gt: 0.01 },
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

  const existingApplication =
    isMemberRole && currentMemberId
      ? await prisma.loanApplication.findFirst({
          where: {
            memberId: currentMemberId,
            status: {
              in: [
                "PENDING",
                "CIBI_REVIEW",
                "MANAGER_REVIEW",
                "COMMITTEE_REVIEW",
                "BOARD_REVIEW",
                "APPROVED",
              ],
            },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, applicationNo: true, status: true },
        })
      : null

  const loanProductsWithReqs = loanProducts.map((p) => ({
    ...p,
    requirements: p.requirements.map((r) => ({
      id: r.requirement.id,
      name: r.requirement.name,
    })),
  }))

  const memberCbu = isMemberRole && members.length === 1 ? Number(members[0].cbu ?? 0) : 0
  const visibleLoanProducts =
    isMemberRole
      ? loanProductsWithReqs.filter(
          (p) => p.requiresGoodStanding === false || memberCbu >= 20000
        )
      : loanProductsWithReqs

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
      ) : isMemberRole && existingApplication ? (
        <div className="flex flex-1 items-center justify-center p-4 pt-6">
          <div className="w-full max-w-2xl text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Outstanding loan application in progress</h2>
                <p className="mt-2 text-base text-muted-foreground">
                  You can’t apply for a new loan right now because you still have a pending loan application
                  ({existingApplication.applicationNo}). If you want to apply again, please remove/cancel your pending application first.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button asChild variant="outline">
                    <Link href="/loans">Go to my applications</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/loans?appStatus=PENDING">View pending</Link>
                  </Button>
                </div>
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
            loanProducts={visibleLoanProducts}
            defaultMemberId={currentMemberId ?? memberId ?? undefined}
            currentMemberId={currentMemberId}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
