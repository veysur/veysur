import React from 'react'
import { ChartType, ChartValueMode } from 'veysur-common'

import { SurveyStatQuestionCard } from './SurveyStatQuestionCard'
import { SurveyStatEmptyState } from './SurveyStatEmptyState'
import { Badge } from 'component/shadcn/badge'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'
import { SurveyStatsResponse } from './model/api/SurveyStatsApi'

interface Props {
  stats: SurveyStatsResponse | null
  isLoading: boolean
  isFetching: boolean
  language?: string
}

export const SurveyStatContainer: React.FC<Props> = ({
  stats,
  isLoading,
  isFetching,
  language = 'en',
}) => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const operations = useSurveyEditorStore((state) => state.operations)

  const handleChartTypeChange = (
    questionCode: string,
    chartType: ChartType,
  ) => {
    operations?.updateSurveyStatsQuestionChartType(questionCode, chartType)
  }

  const handleValueModeChange = (
    questionCode: string,
    valueMode: ChartValueMode,
  ) => {
    operations?.updateSurveyStatsQuestionValueMode(questionCode, valueMode)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    )
  }

  if (!stats || stats.questionStats.length === 0) {
    return (
      <SurveyStatEmptyState
        hasResponses={stats?.totalResponses ? stats.totalResponses > 0 : false}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="text-sm text-muted-foreground">
          Showing statistics from{' '}
          <Badge variant="secondary" className="ml-1">
            {stats.totalResponses}{' '}
            {stats.totalResponses === 1 ? 'response' : 'responses'}
          </Badge>
        </div>
        {isFetching && (
          <span className="text-xs text-muted-foreground">Updating...</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stats.questionStats.map((questionStat) => (
          <SurveyStatQuestionCard
            key={questionStat.questionId}
            questionStat={questionStat}
            language={language}
            survey={survey}
            onChartTypeChange={handleChartTypeChange}
            onValueModeChange={handleValueModeChange}
          />
        ))}
      </div>
    </div>
  )
}
