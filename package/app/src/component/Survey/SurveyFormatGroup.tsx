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
  currentGroupIndex: number
  answers: { [questionCode: string]: unknown }
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

export const SurveyFormatGroup: React.FC<Props> = ({
  presentation,
  contentFormat,
  lang,
  langDefault,
  langOptions,
  allElements,
  currentGroupIndex,
  answers,
  getQuestionExpressionContext,
  getGroupExpressionContext,
  getContentExpressionContext,
  onAnswerChange,
  validationErrors,
  authToken,
  ensureResponseStarted,
}) => {
  const questionOrder = new Map(
    allElements
      .filter(isQuestionItem)
      .map((item, index) => [item.question._id, index]),
  )

  const sortedSections = Array.from(
    new Map(allElements.map((item) => [sectionOf(item)._id, sectionOf(item)])),
  ).map(([, section]) => section)
  const currentSection = sortedSections[currentGroupIndex]
  if (!currentSection) return null

  const sectionItems = allElements.filter(
    (item) => sectionOf(item)._id === currentSection._id,
  )
  const inSectionQuestionIndex = new Map(
    sectionItems
      .filter(isQuestionItem)
      .map((item, index) => [item.question._id, index]),
  )

  return (
    <div className="survey-group-format animate-in fade-in-50 duration-300">
      <SurveyGroupHeader
        group={currentSection}
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
          return (
            <SurveyQuestionRenderer
              key={item.question._id}
              question={item.question}
              presentation={presentation}
              contentFormat={contentFormat}
              lang={lang}
              langDefault={langDefault}
              langOptions={langOptions}
              questionIndex={inSectionQuestionIndex.get(item.question._id)}
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
}
