import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { MembersSearchForm } from "./members-search-form"
import { TablePagination } from "@/components/ui/table-pagination"
import { NewMemberSheet } from "./new-member-sheet"
import { EmptyState } from "@/components/empty-state"

const GOOD_STANDING_CBU = 20_000

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { search } = await searchParams
  const members = await prisma.member.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { memberNo: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { memberNo: "asc" },
    include: { _count: { select: { loans: true } } },
  })

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
                <BreadcrumbPage>Members</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="px-4">
          <NewMemberSheet />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Cooperative members and their CBU, status, and loan count.
          </p>
        </div>
        <Card>
          <CardHeader className="flex items-center justify-end space-y-0 pb-2">
            <MembersSearchForm defaultSearch={search} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium">
                      Member No
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">Name</th>
                    <th className="px-3 py-1.5 text-left font-medium">
                      CBU (₱)
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">Status</th>
                    <th className="px-3 py-1.5 text-left font-medium">Loans</th>
                    <th className="px-3 py-1.5 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-10"
                      >
                        <EmptyState title="No members found" />
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const goodStanding =
                        m.isRegularMember && m.cbu >= GOOD_STANDING_CBU
                      return (
                        <tr
                          key={m.id}
                          className="border-b transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-1.5 font-medium">
                            {m.memberNo}
                          </td>
                          <td className="px-3 py-1.5">{m.name}</td>
                          <td className="px-3 py-1.5">
                            ₱{m.cbu.toLocaleString("en-PH")}
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge
                              variant={goodStanding ? "default" : "secondary"}
                            >
                              {goodStanding ? "Good standing" : "Not eligible"}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5">{m._count.loans}</td>
                          <td className="px-3 py-1.5 text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/members/${m.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-end">
              <TablePagination totalItems={members.length} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
