export interface DateRangeFilter {
  preset: 'all' | 'today' | 'last7' | 'last30' | 'last90' | 'custom'
  startDate: string | null
  endDate: string | null
  dateField: 'createdAt' | 'completed' | 'updatedAt'
}

export const DEFAULT_DATE_RANGE_FILTER: DateRangeFilter = {
  preset: 'all',
  startDate: null,
  endDate: null,
  dateField: 'createdAt',
}
