import React from 'react'
import { cn } from 'common/cn'

import {
  Pagination as PaginationShadCn,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from 'component/shadcn/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'

import { UsePaginationReturn } from 'hook/usePagination'

interface PaginationProps {
  pagination: UsePaginationReturn
  total: number
  maxPagesToShow?: number
  showPerPage?: boolean
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  total,
  maxPagesToShow = 5,
  showPerPage = true,
}) => {
  const page = pagination.page
  const perPage = pagination.perPage
  const totalPages = Math.ceil(total / perPage)
  const hasNextPage = page < totalPages

  const startItem = total === 0 ? 0 : (page - 1) * perPage + 1
  const endItem = Math.min(page * perPage, total)

  const halfRange = Math.floor(maxPagesToShow / 2)
  let startPage = Math.max(1, page - halfRange)
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1)
  }

  const pageNumbers: number[] = []
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i)
  }

  const perPageOptions = [5, 10, 20, 50, 100]

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-y-2 sm:justify-between">
      <div className="flex items-center gap-4 sm:min-w-[10rem]">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {total}
        </div>
      </div>

      <PaginationShadCn className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault()
                if (page > 1) pagination.setPage(page - 1)
              }}
              className={cn(page === 1 && 'pointer-events-none opacity-50')}
              href="#"
            />
          </PaginationItem>

          {pageNumbers.map((pageNum) => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={(e) => {
                  e.preventDefault()
                  pagination.setPage(pageNum)
                }}
                isActive={page === pageNum}
                href="#"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={(e) => {
                e.preventDefault()
                if (hasNextPage) pagination.setPage(page + 1)
              }}
              className={cn(!hasNextPage && 'pointer-events-none opacity-50')}
              href="#"
            />
          </PaginationItem>
        </PaginationContent>
      </PaginationShadCn>

      <div className="flex items-center gap-4 sm:min-w-[10rem] justify-end">
        {showPerPage && pagination.setPerPage && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select
              value={perPage.toString()}
              onValueChange={(value) => {
                pagination.setPerPage(Number(value))
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
