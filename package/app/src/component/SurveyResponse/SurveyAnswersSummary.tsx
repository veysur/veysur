import React from 'react'

import { Badge } from 'component/shadcn/badge'
import { sanitizeHtml } from 'common/sanitizeHtml'
import {
  isMatrixQuestionType,
  isMultiPartQuestionType,
  MatrixResponseData,
  Survey,
  SurveyQuestion,
} from 'veysur-common'

import { formatAnswer } from './formatAnswer'
import { MatrixAnswerSummary } from './MatrixAnswerSummary'
import { MultiPartAnswerSummary } from './MultiPartAnswerSummary'
import { RankingAnswerSummary } from './RankingAnswerSummary'
import {
  FileUploadAnswerSummary,
  ResponseFileSummary,
} from './FileUploadAnswerSummary'

type RankingAnswerValue = { ORDER?: string[] } | null | undefined

const ANSWER_OPTION_TYPES = new Set([
  'checkbox',
  'dropdown',
  'button',
  'imageSelect',
])

interface SurveyAnswersSummaryProps {
  survey: Pick<Survey, 'elements' | 'language'>
  answers: Record<string, unknown>
  lang: string
  isPrint?: boolean
  /** Participant-uploaded files for this response's fileUpload answers -
   * see `FileUploadAnswerSummary`. */
  files?: ResponseFileSummary[]
}

export const SurveyAnswersSummary: React.FC<SurveyAnswersSummaryProps> = ({
  survey,
  answers,
  lang,
  isPrint = false,
  files,
}) => {
  const renderAnswer = (question: SurveyQuestion, answerValue: unknown) => {
    if (question.type === 'fileUpload') {
      return (
        <FileUploadAnswerSummary
          answerValue={answerValue as { fileIds?: string[] } | null}
          files={files}
        />
      )
    }

    if (question.type === 'ranking') {
      return (
        <RankingAnswerSummary
          question={question}
          answerValue={answerValue as RankingAnswerValue}
          lang={lang}
        />
      )
    }

    if (isMatrixQuestionType(question.type)) {
      return (
        <MatrixAnswerSummary
          question={question}
          answerValue={answerValue as MatrixResponseData | null | undefined}
          lang={lang}
          isPrint={isPrint}
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
          isPrint={isPrint}
        />
      )
    }

    const formattedAnswer = formatAnswer(answerValue, question, lang)

    if (!ANSWER_OPTION_TYPES.has(question.type)) {
      return (
        <div className="text-base text-muted-foreground">{formattedAnswer}</div>
      )
    }

    if (Array.isArray(answerValue)) {
      return (
        <div className="flex flex-wrap gap-2">
          {answerValue.map((code: string) => {
            const option = question.answerOptions?.getByCode(code)
            const label = option?.label
              ? option.label.getLang(lang, 'en')
              : code
            return (
              <div key={code} className="flex items-center gap-1">
                <span className="text-base text-muted-foreground">{label}</span>
                <Badge variant="secondary">{code}</Badge>
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof answerValue === 'string') {
      const option = question.answerOptions?.getByCode(answerValue)
      const label = option?.label
        ? option.label.getLang(lang, 'en')
        : answerValue
      return (
        <div className="flex items-center gap-1">
          <span className="text-base text-muted-foreground">{label}</span>
          <Badge variant="secondary">{answerValue}</Badge>
        </div>
      )
    }

    return (
      <div className="text-base text-muted-foreground">{formattedAnswer}</div>
    )
  }

  return (
    <div className="space-y-6">
      {survey?.elements.questionList()?.map((question) => {
        const answerValue = answers?.[question.code]
        return (
          <div
            key={question.code}
            className="pb-4 border-b last:border-b-0 last:pb-0"
          >
            <div
              className="text-sm font-semibold mb-2"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(
                  question.text?.getLang(lang, 'en') || question.code,
                ),
              }}
            ></div>
            {renderAnswer(question, answerValue)}
          </div>
        )
      })}
      {!survey?.elements.questionList()?.length && (
        <div className="text-center text-muted-foreground py-4">
          No questions found in this survey
        </div>
      )}
    </div>
  )
}
