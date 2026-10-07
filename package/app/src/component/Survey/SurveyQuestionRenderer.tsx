import React, { Suspense, useMemo } from 'react'
import {
  SurveyQuestion,
  ValidationMessage,
  resolveTextExpressions,
  ExpressionContext,
  expressionEscapeForContentFormat,
} from 'veysur-common'

import { Label } from 'component/shadcn/label'
import { Badge } from 'component/shadcn/badge'
import { Checkbox } from 'component/shadcn/checkbox'
import { Spinner } from 'component/shadcn/spinner'
import { getQuestionTypeByName } from 'component/SurveyQuestionType/getQuestionType'

import { BadgeRequired } from './BadgeRequired'
import { SurveyQuestionError } from './SurveyQuestionError'
import { SurveyContent } from './SurveyContent'
import {
  SurveyAnswers,
  SurveyPresentationConfig,
  SurveyContentFormatConfig,
} from './SurveyTypes'

type Props = {
  question: SurveyQuestion
  presentation: SurveyPresentationConfig
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  langOptions?: string[]
  questionIndex?: number
  globalQuestionIndex?: number
  answers: SurveyAnswers
  /**
   * Builds the `{{...}}` expression context for a question, scoped to only
   * the answers/questions/groups before it in survey order (later answers
   * must never leak into an earlier question's text). Owned by `Survey.tsx`
   * so every `ExpressionContextBuilder.build` call lives in one place.
   */
  getExpressionContext: (questionId: string) => ExpressionContext
  onAnswerChange: (questionCode: string, value: unknown) => void
  validationErrors: { [questionCode: string]: ValidationMessage[] | undefined }
  /** Participant JWT, forwarded to `QuestionTypeFileUpload` for its upload
   * calls - undefined in admin preview, where no real upload is possible. */
  authToken?: string
  /** Forwarded to `QuestionTypeFileUpload` - see `QuestionTypeProps`. */
  ensureResponseStarted?: () => Promise<void>
}

export const SurveyQuestionRenderer: React.FC<Props> = ({
  question,
  presentation,
  contentFormat,
  lang,
  langDefault,
  langOptions,
  questionIndex,
  globalQuestionIndex,
  answers,
  getExpressionContext,
  onAnswerChange,
  validationErrors,
  authToken,
  ensureResponseStarted,
}) => {
  // Stable, pre-registered component reference from a module-level
  // registry keyed by question type - not created during render.
  const QuestionComponent = getQuestionTypeByName(question.type)
  const isRequired = Boolean(question.attributes?.required)
  const showNoAnswer = presentation.noAnswer && !isRequired

  // JS expressions in question text (e.g. "You said {{answers.Q001}}
  // earlier...", "{{answerLabels.Q001}}", "{{text.Q002}}") - scoped by
  // Survey.tsx to only questions before this one in survey order, mirroring
  // the condition engine's forward-reference protection.
  const expressionContext: ExpressionContext = useMemo(
    () => getExpressionContext(question._id),
    [getExpressionContext, question._id],
  )

  // Neutralise the resolved (participant-controlled) value for the active
  // content format so it cannot become markup/Markdown once SurveyContent
  // renders the template.
  const expressionEscape = expressionEscapeForContentFormat(
    contentFormat.format,
  )

  const questionText = resolveTextExpressions(
    question.text.getLang(lang, langDefault),
    expressionContext,
    { escape: expressionEscape },
  )
  const questionDetail = question.detail
    ? resolveTextExpressions(
        question.detail.getLang(lang, langDefault),
        expressionContext,
        { escape: expressionEscape },
      )
    : null

  return (
    <div className="mb-6">
      <div className="question-header flex items-center gap-2 mb-2">
        {presentation.questionIndex && globalQuestionIndex !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {globalQuestionIndex + 1}
          </Badge>
        )}
        {presentation.questionNum && questionIndex !== undefined && (
          <Badge variant="outline" className="text-xs">
            Q{questionIndex + 1}
          </Badge>
        )}
        {presentation.questionCode && question.code && (
          <Badge variant="outline" className="text-xs font-mono">
            {question.code}
          </Badge>
        )}
      </div>
      <div className="flex items-start gap-2 mb-2">
        {isRequired && <BadgeRequired />}
        <Label className="text-base font-semibold text-foreground flex-1">
          <SurveyContent
            raw={questionText}
            format={contentFormat.format}
            scriptTagsAllowed={contentFormat.scriptTagsAllowed}
            inline
          />
        </Label>
      </div>
      {questionDetail && (
        <SurveyContent
          raw={questionDetail}
          format={contentFormat.format}
          scriptTagsAllowed={contentFormat.scriptTagsAllowed}
          className="text-sm text-muted-foreground mb-3"
        />
      )}
      {QuestionComponent && (
        <div>
          <Suspense fallback={<Spinner size="sm" className="my-2" />}>
            {/* eslint-disable-next-line react-hooks/static-components -- stable registry-provided reference, not created during render */}
            <QuestionComponent
              question={question}
              value={answers[question.code]}
              lang={lang}
              langDefault={langDefault}
              langOptions={langOptions}
              onChange={(value: unknown) =>
                onAnswerChange(question.code, value)
              }
              expressionContext={expressionContext}
              authToken={authToken}
              ensureResponseStarted={ensureResponseStarted}
            />
          </Suspense>
        </div>
      )}
      {showNoAnswer && (
        <div className="flex items-center space-x-2 mt-6">
          <Checkbox
            id={`no-answer-${question.code}`}
            checked={answers[question.code] === null}
            onCheckedChange={(checked) => {
              if (checked) {
                onAnswerChange(question.code, null)
              } else {
                onAnswerChange(question.code, undefined)
              }
            }}
          />
          <Label
            htmlFor={`no-answer-${question.code}`}
            className="text-sm text-muted-foreground cursor-pointer m-0"
          >
            No answer
          </Label>
        </div>
      )}
      <SurveyQuestionError errors={validationErrors[question.code] ?? []} />
    </div>
  )
}
