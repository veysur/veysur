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
        // The list query doesn't populate sections, so this is the number of
        // section ids, which includes the welcome and thank-you sections when
        // a survey has them. A survey imported from markdown may have neither.
        render: (survey) => survey.sectionIds.length,
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
