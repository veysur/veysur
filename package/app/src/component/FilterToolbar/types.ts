import { DateFieldOption, DateRangeFilter } from 'component/DateRangeFilter'

export interface FilterSelectFieldConfig {
  type: 'select'
  key: string
  label: string
  options: { value: string; label: string }[]
  allLabel: string
}

export interface FilterDateRangeFieldConfig {
  type: 'dateRange'
  key: string
  label: string
  dateFieldOptions?: DateFieldOption[]
  showDateFieldSelector?: boolean
}

export type FilterFieldConfig =
  FilterSelectFieldConfig | FilterDateRangeFieldConfig

export type FilterFieldValue = string | DateRangeFilter

export type FilterValues = Record<string, FilterFieldValue>
