import momentTimezone from 'moment-timezone'

export interface DateFilterParams {
  startDate?: string
  endDate?: string
  dateField?: string
  defaultField?: string
  timezone?: string
}

export interface DateRangeQuery {
  $gte?: Date
  $lte?: Date
}

/**
 * Builds a MongoDB query object for date range filtering
 *
 * @param params - Date filter parameters
 * @param params.startDate - Date string (YYYY-MM-DD) for start of range (inclusive)
 * @param params.endDate - Date string (YYYY-MM-DD) for end of range (inclusive)
 * @param params.dateField - Field name to filter on (e.g., 'createdAt', 'completed', 'updatedAt')
 * @param params.defaultField - Default field name if dateField not provided (defaults to 'createdAt')
 * @param params.timezone - IANA timezone the start/end dates are calendar days in (defaults to 'UTC')
 * @returns MongoDB query object with date range conditions, or empty object if no dates provided
 *
 * @example
 * // Filter by date range
 * buildDateRangeQuery({
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31',
 *   dateField: 'createdAt',
 *   timezone: 'America/Los_Angeles',
 * })
 * // Returns: { createdAt: { $gte: <2024-01-01T00:00:00 in LA>, $lte: <2024-12-31T23:59:59.999 in LA> } }
 *
 * @example
 * // Filter by start date only
 * buildDateRangeQuery({ startDate: '2024-01-01', dateField: 'updatedAt' })
 * // Returns: { updatedAt: { $gte: Date('2024-01-01T00:00:00.000Z') } }
 */
export function buildDateRangeQuery(
  params: DateFilterParams,
): Record<string, DateRangeQuery> {
  const {
    startDate,
    endDate,
    dateField,
    defaultField = 'createdAt',
    timezone = 'UTC',
  } = params

  // Return empty query if no date filtering requested
  if (!startDate && !endDate) {
    return {}
  }

  // Determine which field to filter on
  const fieldToFilter = dateField || defaultField

  const query: Record<string, DateRangeQuery> = {}

  // Build date range query - startDate/endDate are calendar days in `timezone`,
  // converted to the correct UTC instant boundaries for that day.
  if (startDate && endDate) {
    // Both start and end dates provided
    const start = momentTimezone.tz(startDate, timezone).startOf('day').toDate()
    const end = momentTimezone.tz(endDate, timezone).endOf('day').toDate()

    query[fieldToFilter] = { $gte: start, $lte: end }
  } else if (startDate) {
    // Only start date provided
    const start = momentTimezone.tz(startDate, timezone).startOf('day').toDate()
    query[fieldToFilter] = { $gte: start }
  } else if (endDate) {
    // Only end date provided
    const end = momentTimezone.tz(endDate, timezone).endOf('day').toDate()
    query[fieldToFilter] = { $lte: end }
  }

  return query
}
