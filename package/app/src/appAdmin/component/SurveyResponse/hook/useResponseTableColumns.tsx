import React, { useMemo } from 'react'
import {
  SurveyResponse,
  isMatrixQuestionType,
  isMultiPartQuestionType,
  isAnonymisedTimestamp,
  Survey,
  SurveyQuestion,
  MatrixResponseData,
} from 'veysur-common'
import { Merge } from 'lucide-react'
import { Checkbox } from 'component/shadcn/checkbox'
import { Badge } from 'component/shadcn/badge'
import { UseSelectionReturn } from 'hook'
import {
  formatAnswer,
  MatrixAnswerSummary,
  MultiPartAnswerSummary,
} from 'component/SurveyResponse'
import { SurveyResponseActionDropdown } from '../'

import { formatCalendar } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

export interface ColumnDefinition {
  key: string
  title: React.ReactNode | string
  render: (response: SurveyResponse) => React.ReactNode
  className?: string
  noTruncate?: boolean
}

export interface UseResponseTableColumnsProps {
  selection: UseSelectionReturn
  responses: SurveyResponse[]
  snapshotData: { survey: Survey | null } | null
  surveyId: string
  selectedSnapshotId: string
}

export interface UseResponseTableColumnsReturn {
  fixedLeftColumns: ColumnDefinition[]
  answerColumns: ColumnDefinition[]
  fixedRightColumns: ColumnDefinition[]
}

export const useResponseTableColumns = ({
  selection,
  responses,
  snapshotData,
  surveyId,
  selectedSnapshotId,
}: UseResponseTableColumnsProps): UseResponseTableColumnsReturn => {
  const tz = useDisplayTimezone()
  const anonymous = !!snapshotData?.survey?.access?.anonymous

  const fixedLeftColumns: ColumnDefinition[] = useMemo(
    () => [
      {
        key: 'select',
        title: (
          <Checkbox
            checked={
              selection.selectAll ||
              (responses.length > 0 &&
                selection.selectedIds.size === responses.length)
            }
            onCheckedChange={() =>
              selection.toggleSelectAll(responses.map((r) => r._id))
            }
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ),
        render: (aResponse: SurveyResponse) => (
          <Checkbox
            checked={
              selection.selectAll || selection.selectedIds.has(aResponse._id)
            }
            onCheckedChange={() => selection.toggleSelection(aResponse._id)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ),
        className: 'w-10',
      },
      {
        key: 'responseId',
        title: 'Response ID',
        render: (response: SurveyResponse) => response._id.slice(-8),
      },
      {
        key: 'participantId',
        title: 'Participant',
        render: (response: SurveyResponse) => {
          const deleted =
            response.participantId != null && !response.participant
          const text = response.participant
            ? response.participant.nameFirst +
              ' ' +
              response.participant.nameLast
            : anonymous
              ? 'Anonymous'
              : response.participantId
                ? response.participantId.slice(-8)
                : 'N/A'
          return (
            <span>
              {text}
              {deleted && (
                <span className="text-muted-foreground text-xs ms-1">
                  (deleted)
                </span>
              )}
            </span>
          )
        },
      },
      {
        key: 'created',
        title: 'Created',
        render: (response: SurveyResponse) =>
          anonymous || isAnonymisedTimestamp(response.createdAt)
            ? 'Anonymised'
            : formatCalendar(response.createdAt, tz),
      },
      {
        key: 'updated',
        title: 'Last Updated',
        render: (response: SurveyResponse) =>
          anonymous || isAnonymisedTimestamp(response.updatedAt)
            ? 'Anonymised'
            : formatCalendar(response.updatedAt, tz),
      },
      {
        key: 'merged',
        title: 'Source',
        render: (response: SurveyResponse) =>
          response.merge?.fromSnapshotId ? (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                <Merge className="h-3 w-3 mr-1" />
                Merged
              </Badge>
            </div>
          ) : null,
      },
    ],
    [selection, responses, tz, anonymous],
  )

  const answerColumns: ColumnDefinition[] = useMemo(() => {
    if (
      !snapshotData?.survey?.elements.questions() ||
      !snapshotData?.survey?.elementIds
    ) {
      return []
    }

    const lang = snapshotData?.survey?.language?.default || 'en'
    const questionMap = new Map(
      snapshotData.survey.elements.questions().map((q) => [q._id, q]),
    )

    return snapshotData.survey.elementIds
      .map((questionId: string) => questionMap.get(questionId))
      .filter((question): question is SurveyQuestion => question !== undefined)
      .map((question) => ({
        key: `answer-${question.code}`,
        title: question.text?.getLang(lang, 'en') || question.code,
        render: (response: SurveyResponse) => {
          const answers = response.answers as Record<string, unknown>
          const answerValue = answers?.[question.code]
          if (isMatrixQuestionType(question.type)) {
            return (
              <MatrixAnswerSummary
                question={question}
                answerValue={
                  answerValue as MatrixResponseData | null | undefined
                }
                lang={lang}
              />
            )
          }
          if (isMultiPartQuestionType(question.type)) {
            return (
              <MultiPartAnswerSummary
                question={question}
                answerValue={
                  answerValue as Record<string, unknown> | null | undefined
                }
                lang={lang}
              />
            )
          }
          return formatAnswer(answerValue, question, lang)
        },
        className: 'w-48 min-w-48 max-w-48',
        noTruncate:
          isMatrixQuestionType(question.type) ||
          isMultiPartQuestionType(question.type),
      }))
  }, [snapshotData])

  const fixedRightColumns: ColumnDefinition[] = useMemo(
    () => [
      {
        key: 'actions',
        title: '',
        render: (response: SurveyResponse) => (
          <SurveyResponseActionDropdown
            response={response}
            surveyId={surveyId}
            snapshotId={selectedSnapshotId}
          />
        ),
        className: 'action-menu text-end py-0.5',
      },
    ],
    [surveyId, selectedSnapshotId],
  )

  return {
    fixedLeftColumns,
    answerColumns,
    fixedRightColumns,
  }
}
