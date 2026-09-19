import { SurveyPublication } from 'veysur-common'

import { formatCalendar } from 'common'

export function formatPublicationName(
  pub: SurveyPublication,
  timezone?: string,
): string {
  const parts: string[] = []

  // Add published date if available
  if (pub.publishedAt) {
    parts.push(formatCalendar(pub.publishedAt, timezone))
  }

  // Add label if available
  if (pub.label) {
    parts.push(pub.label)
  }

  // Always add ID in brackets
  const displayText = parts.length > 0 ? parts.join(' - ') : 'Publication'
  return `${displayText} (ID: ${pub._id.slice(-8)})`
}
