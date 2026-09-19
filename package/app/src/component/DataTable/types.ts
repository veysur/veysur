import * as React from 'react'
import { UseSelectionReturn } from 'hook/useSelection'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  direction: SortDirection
}

/**
 * Column definition for DataTable
 */
export interface ColumnDefinition<TData> {
  /** Unique key for the column */
  key: string
  /** Column header content */
  title: React.ReactNode | string
  /** Function to render cell content */
  render: (row: TData) => React.ReactNode
  /** Optional CSS classes for table cells */
  className?: string
  /** Optional CSS classes for table header */
  headerClassName?: string
  /** Optional click handler for individual cells */
  onClick?: (row: TData) => void
  /** Server-side sort field name for this column. Presence makes the header clickable to sort. */
  sortKey?: string
}

/**
 * Props for DataTable component
 */
export interface DataTableProps<TData> {
  /** Array of data items to display */
  data: TData[]
  /** Column definitions */
  columns: ColumnDefinition<TData>[]
  /** Function to extract unique ID from each row */
  getRowId: (row: TData) => string

  // Selection
  /** Enable row selection with checkboxes */
  enableSelection?: boolean
  /** Selection state from useSelection hook */
  selection?: UseSelectionReturn

  // Row interactions
  /** Handler for row clicks */
  onRowClick?: (row: TData) => void
  /** Make rows clickable with cursor-pointer style */
  clickableRows?: boolean

  // Sorting
  /** Current sort state, or null/undefined if unsorted. Required alongside onSortChange to enable sortable headers. */
  sortState?: SortState | null
  /** Called with the clicked column's sortKey and the direction it should now sort by. */
  onSortChange?: (key: string, direction: SortDirection) => void

  // States
  /** Show loading skeleton */
  isLoading?: boolean
  /** Show loading overlay on top of existing data */
  isFetching?: boolean
  /** Custom empty state content */
  emptyState?: React.ReactNode

  // Styling
  /** CSS classes for the table element */
  className?: string
  /** CSS classes for the container div */
  containerClassName?: string

  // Advanced
  /** Highlight selected rows with background color (default: true) */
  highlightSelected?: boolean
  /** Column keys that should prevent click propagation (default: ['select', 'actions']) */
  preventClickKeys?: string[]
}
