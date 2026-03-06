"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function CreateLoanFromApplication({
  applicationId,
}: {
  applicationId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/create-loan`,
        { method: "POST" }
      )
      const json = await res.json()
      if (!res.ok) {
        alert(json.error ?? "Failed to create loan")
        return
      }
      router.push(`/loans/${json.id}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleCreate}
      disabled={loading}
    >
      {loading ? "Creating…" : "Create loan"}
    </Button>
  )
}
