"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { MembersSearchForm } from "./members-search-form"
import { TablePagination } from "@/components/ui/table-pagination"
import { NewMemberSheet } from "./new-member-sheet"
import { EmptyState } from "@/components/empty-state"
import { MemberStatusButtons } from "./member-status-buttons"
import { EditMemberSheet } from "./edit-member-sheet"

const GOOD_STANDING_CBU = 20_000

type MemberRow = {
  id: string
  memberNo: string
  name: string
  cbu: number
  isRegularMember: boolean
  status?: "ACTIVE" | "INACTIVE"
  _count: { loans: number }
}

export function MembersTable({
  members,
  defaultSearch,
}: {
  members: MemberRow[]
  defaultSearch?: string
}) {
  const [editMemberId, setEditMemberId] = useState<string | null>(null)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <MembersSearchForm defaultSearch={defaultSearch} />
          <NewMemberSheet />
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
                  <th className="px-3 py-1.5 text-left font-medium">
                    Eligibility
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
                    <td colSpan={7} className="px-3 py-10">
                      <EmptyState title="No members found" />
                    </td>
                  </tr>
                ) : (
                  members.map((m) => {
                    const goodStanding =
                      m.isRegularMember && m.cbu >= GOOD_STANDING_CBU
                    const status = m.status ?? "ACTIVE"
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
                          <StatusBadge
                            status={goodStanding ? "GOOD_STANDING" : "NOT_ELIGIBLE"}
                            label={goodStanding ? "Good standing" : "Not eligible"}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <MemberStatusButtons
                            memberId={m.id}
                            status={status}
                          />
                        </td>
                        <td className="px-3 py-1.5">{m._count.loans}</td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="flex justify-end gap-0.5">
                          <Button
                            variant="action"
                            size="icon-sm"
                            asChild
                            title="View"
                          >
                            <Link href={`/members/${m.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="action"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => setEditMemberId(m.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          </div>
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
      <EditMemberSheet
        memberId={editMemberId}
        open={!!editMemberId}
        onOpenChange={(open) => !open && setEditMemberId(null)}
      />
    </>
  )
}
