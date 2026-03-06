"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function MembersSearchForm({
  defaultSearch = "",
}: {
  defaultSearch?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultSearch ?? "")

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) {
        params.set("search", value.trim())
      } else {
        params.delete("search")
      }
      router.push(`/members?${params.toString()}`)
    },
    [value, router, searchParams]
  )

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="search"
        placeholder="Search by name or member no..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-64"
      />
      <Button type="submit" variant="secondary" size="sm">
        Search
      </Button>
    </form>
  )
}
