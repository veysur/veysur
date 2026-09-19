import * as React from 'react'
import { Skeleton } from 'component/shadcn/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'component/shadcn/table'

export interface DataTableSkeletonProps {
  /** Number of columns to display (default: 3) */
  columns?: number
  /** Number of rows to display (default: 5) */
  rows?: number
  /** Show selection column skeleton (default: false) */
  showSelection?: boolean
}

export const DataTableSkeleton: React.FC<DataTableSkeletonProps> = ({
  columns = 3,
  rows = 5,
  showSelection = false,
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showSelection && (
              <TableHead className="w-10">
                <Skeleton className="h-4 w-4" />
              </TableHead>
            )}
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={`header-skeleton-${i}`}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={`row-skeleton-${rowIndex}`}>
              {showSelection && (
                <TableCell className="w-10">
                  <Skeleton className="h-4 w-4" />
                </TableCell>
              )}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={`cell-skeleton-${rowIndex}-${colIndex}`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
