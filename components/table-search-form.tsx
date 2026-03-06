"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function TableSearchForm({
  basePath,
  defaultSearch = "",
  placeholder = "Search...",
  paramName = "search",
  inputClassName,
}: {
  basePath: string
  defaultSearch?: string
  placeholder?: string
  paramName?: string
  inputClassName?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultSearch ?? "")

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()

      if (trimmed) params.set(paramName, trimmed)
      else params.delete(paramName)

      const qs = params.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [basePath, paramName, router, searchParams, value]
  )

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={inputClassName ?? "w-64"}
      />
      <Button type="submit" variant="secondary" size="sm">
        Search
      </Button>
    </form>
  )
}

