import React from 'react'
import {
  Survey,
  SurveySection,
  ParticipantData,
  ExpressionContext,
} from 'veysur-common'

import { SurveyGroupHeader } from './SurveyGroupHeader'
import { SurveyQuestionRenderer } from './SurveyQuestionRenderer'
import { SurveyContentRenderer } from './SurveyContentRenderer'
import {
  isQuestionItem,
  type SurveyPresentationConfig,
  type SurveyContentFormatConfig,
  type SurveyAnswers,
  type ValidationErrors,
  type SurveyRenderItem,
} from './SurveyTypes'

type Props = {
  survey?: Survey
  presentation: SurveyPresentationConfig
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  langOptions?: string[]
  allElements: SurveyRenderItem[]
  answers: SurveyAnswers
  participantData?: ParticipantData
  getQuestionExpressionContext: (questionId: string) => ExpressionContext
  getGroupExpressionContext: (groupId: string) => ExpressionContext
  getContentExpressionContext: (elementId: string) => ExpressionContext
  onAnswerChange: (questionCode: string, value: unknown) => void
  validationErrors: ValidationErrors
  authToken?: string
  ensureResponseStarted?: () => Promise<void>
}

const sectionOf = (item: SurveyRenderItem): SurveySection =>
  item.kind === 'question' ? item.group : item.section

export const SurveyFormatAll: React.FC<Props> = ({
  presentation,
  contentFormat,
  lang,
  langDefault,
  langOptions,
  allElements,
  answers,
  getQuestionExpressionContext,
  getGroupExpressionContext,
  getContentExpressionContext,
  onAnswerChange,
  validationErrors,
  authToken,
  ensureResponseStarted,
}) => {
  // Global question number = position among questions only (content elements
  // never consume a number).
  const questionOrder = new Map(
    allElements
      .filter(isQuestionItem)
      .map((item, index) => [item.question._id, index]),
  )

  const sortedSections = Array.from(
    new Map(allElements.map((item) => [sectionOf(item)._id, sectionOf(item)])),
  ).map(([, section]) => section)

  return (
    <div className="space-y-8">
      {sortedSections.map((section: SurveySection) => {
        const sectionItems = allElements.filter(
          (item) => sectionOf(item)._id === section._id,
        )
        let inSectionQuestionCount = 0
        return (
          <div key={section._id} className="survey-group">
            <SurveyGroupHeader
              group={section}
              presentation={presentation}
              contentFormat={contentFormat}
              lang={lang}
              langDefault={langDefault}
              getExpressionContext={getGroupExpressionContext}
            />
            <div className="space-y-6 mt-6">
              {sectionItems.map((item) => {
                if (item.kind === 'content') {
                  return (
                    <div key={item.element._id} className="mb-6">
                      <SurveyContentRenderer
                        element={item.element}
                        contentFormat={contentFormat}
                        lang={lang}
                        langDefault={langDefault}
                        getExpressionContext={getContentExpressionContext}
                      />
                    </div>
                  )
                }
                const questionIndex = inSectionQuestionCount
                inSectionQuestionCount += 1
                return (
                  <SurveyQuestionRenderer
                    key={item.question._id}
                    question={item.question}
                    presentation={presentation}
                    contentFormat={contentFormat}
                    lang={lang}
                    langDefault={langDefault}
                    langOptions={langOptions}
                    questionIndex={questionIndex}
                    globalQuestionIndex={questionOrder.get(item.question._id)}
                    answers={answers}
                    getExpressionContext={getQuestionExpressionContext}
                    onAnswerChange={onAnswerChange}
                    validationErrors={validationErrors}
                    authToken={authToken}
                    ensureResponseStarted={ensureResponseStarted}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
