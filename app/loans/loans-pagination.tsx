"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { TablePagination } from "@/components/ui/table-pagination"

const DEFAULT_PAGE_SIZE = 10

export function LoansPagination({
  totalItems,
  basePath = "/loans",
  pageParam = "page",
  sizeParam = "size",
}: {
  totalItems: number
  basePath?: string
  pageParam?: string
  sizeParam?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Math.max(1, Number(searchParams.get(pageParam)) || 1)
  const size = Math.max(1, Number(searchParams.get(sizeParam)) || DEFAULT_PAGE_SIZE)

  const buildUrl = useCallback(
    (updates: { page?: number; size?: number }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (updates.page != null) params.set(pageParam, String(updates.page))
      if (updates.size != null) {
        params.set(sizeParam, String(updates.size))
        params.set(pageParam, "1")
      }
      const qs = params.toString()
      return qs ? `${basePath}?${qs}` : basePath
    },
    [basePath, pageParam, sizeParam, searchParams]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      router.push(buildUrl({ page: newPage }))
    },
    [router, buildUrl]
  )

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      router.push(buildUrl({ size: newSize }))
    },
    [router, buildUrl]
  )

  return (
    <TablePagination
      totalItems={totalItems}
      page={page}
      pageSize={size}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  )
}
