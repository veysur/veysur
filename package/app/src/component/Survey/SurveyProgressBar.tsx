import React from 'react'
import { useTranslation } from 'react-i18next'
import { Progress } from '@/component/shadcn/progress'
import { Badge } from 'component/shadcn/badge'
import { Survey, isGroupSection } from 'veysur-common'
import {
  isQuestionItem,
  type QuestionWithGroup,
  type SurveyPresentationConfig,
  type SurveyRenderItem,
} from './SurveyTypes'

type Props = {
  format: string
  presentation: SurveyPresentationConfig
  getAnsweredCount: () => number
  getTotalItems: () => number
  getProgressPercentage: () => number
  // Answerable (questions-only) list — the progress denominator.
  allQuestions: QuestionWithGroup[]
  // The full ordered list; `currentQuestionIndex` indexes this one.
  visibleElements: SurveyRenderItem[]
  survey?: Survey
  currentGroupIndex: number
  currentQuestionIndex: number
}

export const SurveyProgressBar: React.FC<Props> = ({
  format,
  presentation,
  getAnsweredCount,
  getTotalItems,
  getProgressPercentage,
  allQuestions,
  visibleElements,
  survey,
  currentGroupIndex,
  currentQuestionIndex,
}) => {
  const { t } = useTranslation('app-survey')

  const getQuestionRangeForGroup = () => {
    const groupSections = Array.from(survey?.sections ?? []).filter(
      isGroupSection,
    )
    const currentGroup = groupSections[currentGroupIndex]
    if (!currentGroup) return null

    // Derive counts from allQuestions (already filtered by display conditions)
    // rather than the raw survey model, so the range never exceeds totalQuestions.
    const groupQuestionsCount = allQuestions.filter(
      ({ group }) => group._id === currentGroup._id,
    ).length

    const startQuestionIndex =
      allQuestions.findIndex(({ group }) => group._id === currentGroup._id) + 1

    if (startQuestionIndex === 0 || groupQuestionsCount === 0) return null

    const endQuestionIndex = startQuestionIndex + groupQuestionsCount - 1

    return {
      startQuestionIndex,
      endQuestionIndex,
      groupQuestionsCount,
    }
  }

  const currentIsContent =
    visibleElements[currentQuestionIndex]?.kind === 'content'

  const getQuestionCountText = () => {
    const totalQuestions = allQuestions.length

    switch (format) {
      case 'question': {
        // `currentQuestionIndex` spans content pages — count questions at or
        // before it to get the "question N of M" figure.
        const current = visibleElements
          .slice(0, currentQuestionIndex + 1)
          .filter(isQuestionItem).length
        return t('progress.questionOfTotal', {
          current,
          total: totalQuestions,
        })
      }

      case 'group': {
        const questionRange = getQuestionRangeForGroup()
        if (!questionRange) {
          return t('progress.pageOfTotal', {
            current: currentGroupIndex + 1,
            total: getTotalItems(),
          })
        }

        const { startQuestionIndex, endQuestionIndex, groupQuestionsCount } =
          questionRange
        return t('progress.questionRangeOfTotal', {
          count: groupQuestionsCount,
          start: startQuestionIndex,
          end: endQuestionIndex,
          total: totalQuestions,
        })
      }

      default: {
        const answeredCount = getAnsweredCount()
        return t('progress.answeredOfTotal', {
          count: totalQuestions,
          answered: answeredCount,
          total: totalQuestions,
        })
      }
    }
  }

  const renderProgressBar = () => {
    if (!presentation.progressBar) return null

    const progressPercentage = getProgressPercentage()

    return (
      <div className="relative">
        <Progress
          value={progressPercentage}
          className="h-7 w-full transition-all duration-300"
          aria-valuenow={getAnsweredCount()}
          aria-valuemin={0}
          aria-valuemax={getTotalItems()}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Badge variant="default" className="text-xs font-semibold">
            {Math.round(progressPercentage)}%
          </Badge>
        </div>
      </div>
    )
  }

  const renderQuestionCount = () => {
    if (!presentation.questionCount) return null
    // A content page has no question number to show.
    if (format === 'question' && currentIsContent) return null

    return (
      <div className="survey-question-count mt-4 mb-4">
        <p className="text-sm text-muted-foreground text-center">
          {getQuestionCountText()}
        </p>
      </div>
    )
  }

  return (
    <>
      {renderProgressBar()}
      {renderQuestionCount()}
    </>
  )
}
