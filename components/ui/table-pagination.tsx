 "use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DEFAULT_PAGE_SIZES = [10, 25, 50]

type TablePaginationProps = {
  totalItems: number
  initialPageSize?: number
  pageSizeOptions?: number[]
  /** Controlled: current 1-based page */
  page?: number
  /** Controlled: called when page changes */
  onPageChange?: (page: number) => void
  /** Controlled: current page size */
  pageSize?: number
  /** Controlled: called when page size changes */
  onPageSizeChange?: (pageSize: number) => void
}

export function TablePagination({
  totalItems,
  initialPageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  page: controlledPage,
  onPageChange,
  pageSize: controlledPageSize,
  onPageSizeChange,
}: TablePaginationProps) {
  const [internalPageSize, setInternalPageSize] = useState(
    initialPageSize && pageSizeOptions.includes(initialPageSize)
      ? initialPageSize
      : pageSizeOptions[0]
  )
  const [internalPage, setInternalPage] = useState(1)

  const isControlled =
    controlledPage != null &&
    onPageChange != null &&
    controlledPageSize != null &&
    onPageSizeChange != null
  const pageSize = isControlled ? controlledPageSize : internalPageSize
  const page = isControlled ? controlledPage : internalPage
  const setPage = isControlled ? onPageChange! : setInternalPage
  const setPageSize = (next: number) => {
    if (isControlled) {
      onPageSizeChange!(next)
      onPageChange(1)
    } else {
      setInternalPageSize(next)
      setInternalPage(1)
    }
  }

  const { pageCount, from, to } = useMemo(() => {
    if (totalItems === 0) {
      return { pageCount: 1, from: 0, to: 0 }
    }
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
    const safePage = Math.min(page, pageCount)
    const from = (safePage - 1) * pageSize + 1
    const to = Math.min(totalItems, safePage * pageSize)
    return { pageCount, from, to }
  }, [totalItems, page, pageSize])

  const canPrev = page > 1
  const canNext = page < pageCount

  return (
    <div className="flex items-center justify-between gap-4 py-2 text-xs text-muted-foreground">
      <div>
        {totalItems === 0 ? (
          <span>0 of 0 row(s)</span>
        ) : (
          <span>
            {from}-{to} of {totalItems} row(s)
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              const nextSize = Number(value) || pageSize
              setPageSize(nextSize)
            }}
          >
            <SelectTrigger className="h-7 w-16 px-2 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPage(1)}
            disabled={!canPrev}
          >
            <ChevronsLeft className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={!canPrev}
          >
            <ChevronLeft className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPage(Math.min(pageCount, page + 1))}
            disabled={!canNext}
          >
            <ChevronRight className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPage(pageCount)}
            disabled={!canNext}
          >
            <ChevronsRight className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

