import React from 'react'

import {
  MultiPartResponseData,
  MultiPartValue,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  SurveyQuestion,
} from 'veysur-common'

import { useRandomisationContext } from 'component/Survey/RandomisationContext'
import { useQuestionRandomisation } from 'component/Survey/hook/useQuestionRandomisation'

import { QuestionTypeProps, resolveLabelText } from './QuestionTypeProps'
import { QuestionTypeText } from './QuestionTypeText'
import { QuestionTypeNumber } from './QuestionTypeNumber'
import {
  MultipleChoiceYesNo,
  MultipleChoiceStarRating,
  MultipleChoicePoint5,
  MultipleChoicePoint10,
  RatingScaleLabelsHeader,
} from './MultipleChoice'
import { POINT_SCALE_LAYOUT } from './MultipleChoice/ratingScaleLabels'

const LABEL_COLUMN_CLASS = 'sm:w-40 sm:shrink-0'

/**
 * Renders every part (subquestion) of a Multi-Part question as a vertical
 * list — the one-axis sibling of `QuestionTypeMatrix`'s 2D grid. Each row is
 * the part's label plus the single input implied by the question's variant,
 * reusing the same standalone components `QuestionTypeMatrix` dispatches to.
 */
export const QuestionTypeMultiPart: React.FC<QuestionTypeProps> = ({
  question,
  value,
  lang,
  langDefault,
  onChange,
  expressionContext,
}) => {
  const rawParts = question?.subquestions || []

  const { randomSeeds, onSeedRequired } = useRandomisationContext()
  const isRandomised = Boolean(question?.attributes?.choiceRandomise)
  const parts = useQuestionRandomisation(
    rawParts,
    `${question?.code}_subq`,
    isRandomised,
    randomSeeds,
    onSeedRequired,
  )

  const currentValue: MultiPartResponseData =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value
      : {}

  const handlePartChange = (
    partCode: string,
    partValue: MultiPartValue | undefined,
  ) => {
    if (!onChange) return
    const next = { ...currentValue }
    if (partValue === undefined || partValue === '') {
      delete next[partCode]
    } else {
      next[partCode] = partValue
    }
    onChange(next)
  }

  const pointScaleType =
    parts[0]?.type === QUESTION_TYPE_POINT_5 ||
    parts[0]?.type === QUESTION_TYPE_POINT_10 ||
    parts[0]?.type === QUESTION_TYPE_STAR_RATING
      ? parts[0].type
      : undefined

  const renderPartInput = (part: (typeof parts)[number]) => {
    const partVal = currentValue[part.code]
    const partAsQuestion = new SurveyQuestion({ ...part })
    // Point-scale parts (star/point5/point10) share a single set of point
    // labels stored once on the parent question - see
    // `questionType/pointScale.ts` - rather than per part, so the parent's
    // `answerOptions` must be threaded in here for the caption to render.
    const partAsPointScaleQuestion = new SurveyQuestion({
      ...part,
      answerOptions: question.answerOptions,
    })
    const onPartChange = (v: MultiPartValue | undefined) =>
      handlePartChange(part.code, v)

    if (part.type === QUESTION_TYPE_NUMBER) {
      return (
        <QuestionTypeNumber
          question={partAsQuestion}
          lang={lang}
          langDefault={langDefault}
          value={partVal}
          onChange={onPartChange}
        />
      )
    }

    if (part.type === QUESTION_TYPE_YES_NO) {
      return (
        <MultipleChoiceYesNo
          question={partAsQuestion}
          lang={lang}
          langDefault={langDefault}
          value={partVal}
          onChange={onPartChange}
        />
      )
    }

    if (part.type === QUESTION_TYPE_STAR_RATING) {
      return (
        <MultipleChoiceStarRating
          question={partAsPointScaleQuestion}
          lang={lang}
          langDefault={langDefault}
          value={partVal}
          onChange={onPartChange}
          hideLabels={Boolean(pointScaleType)}
        />
      )
    }

    if (part.type === QUESTION_TYPE_POINT_5) {
      return (
        <MultipleChoicePoint5
          question={partAsPointScaleQuestion}
          lang={lang}
          langDefault={langDefault}
          value={partVal}
          onChange={onPartChange}
          hideLabels={Boolean(pointScaleType)}
        />
      )
    }

    if (part.type === QUESTION_TYPE_POINT_10) {
      return (
        <MultipleChoicePoint10
          question={partAsPointScaleQuestion}
          lang={lang}
          langDefault={langDefault}
          value={partVal}
          onChange={onPartChange}
          hideLabels={Boolean(pointScaleType)}
        />
      )
    }

    // QUESTION_TYPE_TEXT (default)
    return (
      <QuestionTypeText
        question={partAsQuestion}
        lang={lang}
        langDefault={langDefault}
        value={partVal}
        onChange={(v) => onPartChange(v || undefined)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="multi-part-question">
      {pointScaleType === QUESTION_TYPE_POINT_10 && (
        <RatingScaleLabelsHeader
          question={question}
          lang={lang}
          langDefault={langDefault}
          pointCount={10}
          {...POINT_SCALE_LAYOUT[QUESTION_TYPE_POINT_10]}
        />
      )}
      {(pointScaleType === QUESTION_TYPE_POINT_5 ||
        pointScaleType === QUESTION_TYPE_STAR_RATING) && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-3">
          <div className={`hidden sm:block ${LABEL_COLUMN_CLASS}`} />
          <RatingScaleLabelsHeader
            question={question}
            lang={lang}
            langDefault={langDefault}
            pointCount={5}
            {...POINT_SCALE_LAYOUT[pointScaleType]}
          />
        </div>
      )}
      {parts.map((part) => (
        <div
          key={part._id}
          className={
            part.type === QUESTION_TYPE_POINT_10
              ? 'flex flex-col gap-2'
              : 'flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3'
          }
        >
          <div
            className={`text-sm ${part.type === QUESTION_TYPE_POINT_10 ? 'w-full' : LABEL_COLUMN_CLASS}`}
          >
            {resolveLabelText(
              part.text.getLang(lang, langDefault),
              expressionContext,
            )}
          </div>
          {renderPartInput(part)}
        </div>
      ))}
    </div>
  )
}
