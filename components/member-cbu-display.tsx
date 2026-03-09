"use client"

import { useSession } from "next-auth/react"

/**
 * Shows the logged-in member's CBU (savings) in the header. Renders only when role is MEMBER.
 */
export function MemberCbuDisplay() {
  const { data: session } = useSession()
  const cbu = session?.user?.cbu

  if (session?.user?.role !== "MEMBER" || cbu == null) return null

  return (
    <span className="rounded-md border bg-muted/50 px-3 py-1.5 text-sm font-medium tabular-nums">
      CBU: ₱{Number(cbu).toLocaleString("en-PH")}
    </span>
  )
}
