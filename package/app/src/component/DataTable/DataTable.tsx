import * as React from 'react'
import { cn } from 'common/cn'
import { Card, CardContent } from 'component/shadcn/card'
import { Checkbox } from 'component/shadcn/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'component/shadcn/table'
import { DataTableProps, ColumnDefinition } from './types'
import { DataTableSkeleton } from './DataTableSkeleton'
import { DataTableEmpty } from './DataTableEmpty'
import { SortableHeader } from './SortableHeader'

/**
 * Reusable data table component with optional row selection
 *
 * @example
 * // Simple table without selection
 * <DataTable
 *   data={items}
 *   columns={columns}
 *   getRowId={(item) => item._id}
 *   onRowClick={handleRowClick}
 * />
 *
 * @example
 * // Table with selection
 * const selection = useSelection()
 * <DataTable
 *   data={items}
 *   columns={columns}
 *   getRowId={(item) => item._id}
 *   enableSelection
 *   selection={selection}
 * />
 */
export function DataTable<TData>({
  data,
  columns,
  getRowId,
  enableSelection = false,
  selection,
  onRowClick,
  clickableRows = true,
  sortState,
  onSortChange,
  isLoading = false,
  isFetching = false,
  emptyState,
  className,
  containerClassName,
  highlightSelected = true,
  preventClickKeys = ['select', 'actions'],
}: DataTableProps<TData>) {
  // Validate selection props
  if (enableSelection && !selection) {
    console.warn(
      'DataTable: enableSelection is true but selection prop is not provided. Use the useSelection hook.',
    )
  }

  // Build final columns including optional selection column
  const finalColumns = React.useMemo(() => {
    if (!enableSelection || !selection) {
      return columns
    }

    const selectionColumn: ColumnDefinition<TData> = {
      key: 'select',
      title: (
        <Checkbox
          checked={
            selection.selectAll ||
            (data.length > 0 && selection.selectedIds.size === data.length)
          }
          onCheckedChange={() =>
            selection.toggleSelectAll(data.map((row) => getRowId(row)))
          }
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
      render: (row: TData) => (
        <Checkbox
          checked={
            selection.selectAll || selection.selectedIds.has(getRowId(row))
          }
          onCheckedChange={() => selection.toggleSelection(getRowId(row))}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
      className: 'w-10',
    }

    return [selectionColumn, ...columns]
  }, [enableSelection, selection, columns, data, getRowId])

  // Show loading skeleton
  if (isLoading) {
    return (
      <DataTableSkeleton
        columns={columns.length}
        showSelection={enableSelection}
      />
    )
  }

  // Show empty state
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border">
        {emptyState || <DataTableEmpty />}
      </div>
    )
  }

  // Determine if rows should be clickable
  const rowsClickable = clickableRows && !!onRowClick

  return (
    <div className={cn('border-0 relative', containerClassName)}>
      {isFetching && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      )}
      <Card className="p-2">
        <CardContent className="p-0">
          <Table className={className}>
            <TableHeader>
              <TableRow>
                {finalColumns.map((col) => {
                  const isActiveSort =
                    !!sortState && sortState.key === col.sortKey
                  const activeDirection = isActiveSort
                    ? sortState?.direction
                    : undefined

                  return (
                    <TableHead
                      key={`${col.key}-head`}
                      className={cn(col.headerClassName, col.className)}
                    >
                      {col.sortKey && onSortChange ? (
                        <SortableHeader
                          label={col.title}
                          active={isActiveSort}
                          direction={activeDirection}
                          onClick={() =>
                            onSortChange(
                              col.sortKey as string,
                              activeDirection === 'asc' ? 'desc' : 'asc',
                            )
                          }
                        />
                      ) : (
                        col.title
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const rowId = getRowId(row)
                const isSelected =
                  enableSelection &&
                  selection &&
                  (selection.selectAll || selection.selectedIds.has(rowId))

                return (
                  <TableRow
                    key={`row-${rowId}`}
                    onClick={rowsClickable ? () => onRowClick(row) : undefined}
                    className={cn([
                      rowsClickable && 'cursor-pointer',
                      highlightSelected && isSelected && 'bg-muted/70',
                    ])}
                  >
                    {finalColumns.map((col) => {
                      const shouldPreventClick = preventClickKeys.includes(
                        col.key,
                      )

                      return (
                        <TableCell
                          key={`${col.key}-${rowId}`}
                          className={cn('align-middle', col.className)}
                          onClick={
                            shouldPreventClick
                              ? (e) => {
                                  e.stopPropagation()
                                  // Call column-specific onClick if provided
                                  if (col.onClick) {
                                    col.onClick(row)
                                  }
                                }
                              : col.onClick
                                ? () => col.onClick?.(row)
                                : undefined
                          }
                        >
                          {col.render(row)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
