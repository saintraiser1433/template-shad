import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { CIBIForm } from "./cibi-form"

export default async function LoanApplicationCIBIPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = session.user.role
  const allowedRoles = ["ADMIN", "MANAGER", "COLLECTOR"]
  if (!allowedRoles.includes(role ?? "")) redirect("/dashboard")

  const { id: applicationId } = await params
  const application = await prisma.loanApplication.findUnique({
    where: { id: applicationId },
    include: {
      member: { select: { id: true, memberNo: true, name: true } },
    },
  })
  if (!application) notFound()
  if (!["PENDING", "CIBI_REVIEW"].includes(application.status)) {
    redirect("/loans/pending")
  }

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
                <BreadcrumbLink href="/loans/pending">Pending CI/BI</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>CI/BI — {application.applicationNo}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        addButton={
          <Button variant="action" size="icon-sm" asChild title="Back to list">
            <Link href="/loans/pending">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <CIBIForm
          applicationId={application.id}
          applicationNo={application.applicationNo}
          memberName={application.member.name}
          memberNo={application.member.memberNo}
          currentStatus={application.status}
          defaultValues={{
            characterNotes: application.characterNotes ?? "",
            capacityNotes: application.capacityNotes ?? "",
            capitalNotes: application.capitalNotes ?? "",
            collateralNotes: application.collateralNotes ?? "",
            conditionsNotes: application.conditionsNotes ?? "",
            cibiPassed: application.cibiPassed ?? false,
          }}
        />
      </div>
    </DashboardLayout>
  )
}
