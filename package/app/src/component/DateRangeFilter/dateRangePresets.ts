import momentTimezone from 'moment-timezone'

export const getPresetDates = (
  preset: string,
  timezone?: string,
): {
  startDate: string | null
  endDate: string | null
} => {
  const now = timezone ? momentTimezone.tz(timezone) : momentTimezone()
  const today = now.format('YYYY-MM-DD')

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today }

    case 'last7':
      return {
        startDate: now.clone().subtract(7, 'days').format('YYYY-MM-DD'),
        endDate: today,
      }

    case 'last30':
      return {
        startDate: now.clone().subtract(30, 'days').format('YYYY-MM-DD'),
        endDate: today,
      }

    case 'last90':
      return {
        startDate: now.clone().subtract(90, 'days').format('YYYY-MM-DD'),
        endDate: today,
      }

    case 'all':
    default:
      return { startDate: null, endDate: null }
  }
}

export const getPresetLabel = (preset: string): string => {
  switch (preset) {
    case 'all':
      return 'All Time'
    case 'today':
      return 'Today'
    case 'last7':
      return 'Last 7 days'
    case 'last30':
      return 'Last 30 days'
    case 'last90':
      return 'Last 90 days'
    case 'custom':
      return 'Custom'
    default:
      return 'All Time'
  }
}

export const formatDateRange = (
  startDate: string | null,
  endDate: string | null,
): string => {
  if (!startDate && !endDate) {
    return 'All Time'
  }

  const formatDate = (date: string) => momentTimezone(date).format('ll')

  if (startDate && endDate) {
    if (startDate === endDate) {
      return formatDate(startDate)
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  if (startDate) {
    return `From ${formatDate(startDate)}`
  }

  if (endDate) {
    return `Until ${formatDate(endDate)}`
  }

  return 'All Time'
}

export const isValidDateRange = (
  startDate: string | null,
  endDate: string | null,
): boolean => {
  if (!startDate || !endDate) {
    return true // Partial ranges are valid
  }

  const start = momentTimezone(startDate)
  const end = momentTimezone(endDate)

  return end.isSameOrAfter(start)
}
