import { Link } from 'react-router-dom'

import { DataTable } from 'component/DataTable'
import { ColumnDefinition } from 'component/DataTable/types'
import { Button } from 'component/shadcn/button'

export interface RecentListCardProps<TData> {
  title: string
  description?: string
  viewAllHref: string
  data: TData[]
  columns: ColumnDefinition<TData>[]
  getRowId: (row: TData) => string
  onRowClick?: (row: TData) => void
  emptyMessage: string
  isLoading?: boolean
  isFetching?: boolean
}

export const RecentListCard = <TData,>({
  title,
  description,
  viewAllHref,
  data,
  columns,
  getRowId,
  onRowClick,
  emptyMessage,
  isLoading,
  isFetching,
}: RecentListCardProps<TData>) => (
  <div>
    <div className="flex items-center justify-between gap-4 mb-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link to={viewAllHref}>View all</Link>
      </Button>
    </div>
    <DataTable
      data={data}
      columns={columns}
      getRowId={getRowId}
      onRowClick={onRowClick}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyState={
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      }
    />
  </div>
)
