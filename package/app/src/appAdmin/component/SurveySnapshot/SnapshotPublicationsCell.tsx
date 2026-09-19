import React from 'react'
import { Link } from 'react-router-dom'
import { SurveySnapshotPartial, SurveyPublication } from 'veysur-common'
import { BookOpen } from 'lucide-react'

import { cn } from 'common/cn'
import { formatDate } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

interface Props {
  snapshot: SurveySnapshotPartial
  surveyId: string
}

export const SnapshotPublicationsCell: React.FC<Props> = ({
  snapshot,
  surveyId,
}) => {
  const tz = useDisplayTimezone()
  const publications = (snapshot.publications || []) as SurveyPublication[]
  const publicationCount = publications.length

  // Find the most recent publication
  const latestPublication =
    publications.length > 0
      ? [...publications].sort(
          (a, b) =>
            new Date(b.publishedAt || 0).getTime() -
            new Date(a.publishedAt || 0).getTime(),
        )[0]
      : null

  if (publicationCount === 0) {
    return <span className="text-muted-foreground">None</span>
  }

  const isActive = latestPublication && !latestPublication.stoppedAt

  return (
    <Link
      to={`/survey/${surveyId}/publication/${snapshot._id}`}
      className="flex items-center gap-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <BookOpen className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate">
            {latestPublication?.label || 'Unlabelled'}
          </span>
          {isActive && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-xs font-medium',
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
              )}
            >
              Published
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {latestPublication && formatDate(latestPublication.publishedAt, tz)}
          {publicationCount > 1 && ` • ${publicationCount} total`}
        </div>
      </div>
    </Link>
  )
}
