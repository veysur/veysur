import React from 'react'
import {
  Survey as SurveyEntity,
  SurveySection,
  ParticipantData,
  ExpressionContext,
} from 'veysur-common'

import { SurveyGroupHeader } from './SurveyGroupHeader'
import { SurveyQuestionRenderer } from './SurveyQuestionRenderer'
import { SurveyContentRenderer } from './SurveyContentRenderer'
import {
  isQuestionItem,
  type SurveyAnswers,
  type SurveyPresentationConfig,
  type SurveyContentFormatConfig,
  type ValidationErrors,
  type SurveyRenderItem,
} from './SurveyTypes'

type Props = {
  survey?: SurveyEntity
  presentation: SurveyPresentationConfig
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  langOptions?: string[]
  allElements: SurveyRenderItem[]
  currentQuestionIndex: number
  answers: SurveyAnswers
  participantData?: ParticipantData
  getQuestionExpressionContext: (questionId: string) => ExpressionContext
  getGroupExpressionContext: (groupId: string) => ExpressionContext
  getContentExpressionContext: (elementId: string) => ExpressionContext
  onAnswerChange: (questionCode: string, value: unknown) => void
  validationErrors: ValidationErrors
  authToken?: string
}

const sectionOf = (item: SurveyRenderItem): SurveySection =>
  item.kind === 'question' ? item.group : item.section

export const SurveyFormatQuestion: React.FC<Props> = ({
  presentation,
  contentFormat,
  lang,
  langDefault,
  langOptions,
  allElements,
  currentQuestionIndex,
  answers,
  getQuestionExpressionContext,
  getGroupExpressionContext,
  getContentExpressionContext,
  onAnswerChange,
  validationErrors,
  authToken,
}) => {
  const currentItem = allElements[currentQuestionIndex]
  if (!currentItem) return null

  const section = sectionOf(currentItem)

  // Numbering counts questions only (a content page consumes no number).
  const questionOrder = new Map(
    allElements
      .filter(isQuestionItem)
      .map((item, index) => [item.question._id, index]),
  )

  return (
    <div className="survey-question-format animate-in slide-in-from-right-5 duration-300">
      <SurveyGroupHeader
        group={section}
        presentation={presentation}
        contentFormat={contentFormat}
        lang={lang}
        langDefault={langDefault}
        getExpressionContext={getGroupExpressionContext}
      />
      <div className="mt-6">
        {currentItem.kind === 'content' ? (
          <SurveyContentRenderer
            element={currentItem.element}
            contentFormat={contentFormat}
            lang={lang}
            langDefault={langDefault}
            getExpressionContext={getContentExpressionContext}
          />
        ) : (
          <SurveyQuestionRenderer
            question={currentItem.question}
            presentation={presentation}
            contentFormat={contentFormat}
            lang={lang}
            langDefault={langDefault}
            langOptions={langOptions}
            questionIndex={
              allElements.filter(
                (item, index) =>
                  index <= currentQuestionIndex &&
                  isQuestionItem(item) &&
                  item.group._id === section._id,
              ).length - 1
            }
            globalQuestionIndex={questionOrder.get(currentItem.question._id)}
            answers={answers}
            getExpressionContext={getQuestionExpressionContext}
            onAnswerChange={onAnswerChange}
            validationErrors={validationErrors}
            authToken={authToken}
          />
        )}
      </div>
    </div>
  )
}
