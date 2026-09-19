import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Survey } from 'veysur-common'
import type { ColumnDefinition } from 'component/DataTable'
import { SurveyRowAction } from '../SurveyRowAction'

import { formatCalendar } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

export const useSurveyTableColumns = (): ColumnDefinition<Survey>[] => {
  const tz = useDisplayTimezone()
  return useMemo(
    () => [
      {
        key: 'name',
        title: 'Name',
        render: (survey) => (
          <Link to={`/survey/${survey._id}/edit`}>{survey.name}</Link>
        ),
      },
      {
        key: 'sections',
        title: '# Sections',
        // Every survey has exactly one welcome and one thank-you section
        // (fixed singletons, never deletable) alongside its groups, so
        // subtracting them out of sectionIds is exact without needing to
        // populate/filter the full sections collection for a list row.
        render: (survey) => survey.sectionIds.length - 2,
      },
      {
        key: 'elements',
        title: '# Elements',
        // Includes content items (text/video blocks) alongside questions —
        // the list query doesn't populate elements, so there's no cheap way
        // to exclude them here. Known limitation.
        render: (survey) => survey.elementIds.length,
      },
      {
        key: 'created',
        title: 'Created',
        render: (survey) => formatCalendar(survey.createdAt, tz),
      },
      {
        key: 'updated',
        title: 'Updated',
        render: (survey) => formatCalendar(survey.updatedAt, tz),
      },
      {
        key: 'actions',
        title: '',
        render: (survey) => <SurveyRowAction survey={survey} />,
        className: 'action-menu text-end',
      },
    ],
    [tz],
  )
}
