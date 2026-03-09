import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UsersTableWithModals } from "./users-table-with-modals"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { search } = await searchParams
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  })

  return (
    <DashboardLayout>
        <UsersTableWithModals
          users={users}
          currentUserId={session.user.id}
          search={search}
          breadcrumb={
            <nav className="flex items-center gap-2 text-sm">
              <a href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </a>
              <span className="text-muted-foreground">/</span>
              <span>Users</span>
            </nav>
            }
          />
    </DashboardLayout>
  )
}
