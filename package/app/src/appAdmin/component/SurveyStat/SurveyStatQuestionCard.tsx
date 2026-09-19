import React from 'react'
import { BarChart3 } from 'lucide-react'
import {
  Survey,
  ChartType,
  ChartValueMode,
  getAvailableChartTypes,
} from 'veysur-common'

import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { stripHtml } from 'common'
import { cn } from '@/common/cn'

import type { QuestionStats } from './model/api/SurveyStatsApi'
import { SurveyStatChart } from './SurveyStatChart'
import { clampChartType, getLabel } from './chartUtils'

interface Props {
  questionStat: QuestionStats
  language: string
  survey?: Survey
  onChartTypeChange?: (questionCode: string, chartType: ChartType) => void
  onValueModeChange?: (questionCode: string, valueMode: ChartValueMode) => void
}

export const SurveyStatQuestionCard: React.FC<Props> = ({
  questionStat,
  language,
  survey,
  onChartTypeChange,
  onValueModeChange,
}) => {
  const questionText = stripHtml(
    getLabel(questionStat.questionText, language, 'Untitled Question'),
  )

  // A pie grid renders one small pie per subquestion/part, so give that card
  // the full grid row. Uses the saved value (not an optimistic switch) - a
  // one-render layout lag on change is acceptable.
  const effectiveChartType = clampChartType(
    survey?.stats?.questions?.[questionStat.questionCode]?.chartType,
    getAvailableChartTypes(questionStat.questionType),
  )

  return (
    <Card
      className={cn(
        effectiveChartType === 'pieGrid' && 'md:col-span-2 xl:col-span-3',
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-start gap-3">
          <BarChart3 className="h-5 w-5 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-lg font-medium">{questionText}</div>
            <div className="text-sm text-muted-foreground font-normal mt-1">
              {questionStat.totalResponses}{' '}
              {questionStat.totalResponses === 1 ? 'response' : 'responses'}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SurveyStatChart
          questionStat={questionStat}
          questionCode={questionStat.questionCode}
          language={language}
          survey={survey}
          onChartTypeChange={onChartTypeChange}
          onValueModeChange={onValueModeChange}
        />
      </CardContent>
    </Card>
  )
}
