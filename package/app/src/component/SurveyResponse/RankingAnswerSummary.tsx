import React from 'react'
import {
  SurveyQuestion,
  SurveyAnswerOption,
  SurveyAnswerOptionCollection,
} from 'veysur-common'

import { Badge } from 'component/shadcn/badge'

type RankingAnswerValue = { ORDER?: string[] } | null | undefined

interface RankingAnswerSummaryProps {
  question: SurveyQuestion
  answerValue: RankingAnswerValue
  lang: string
}

export const RankingAnswerSummary: React.FC<RankingAnswerSummaryProps> = ({
  question,
  answerValue,
  lang,
}) => {
  const answerOptions =
    question.answerOptions ?? new SurveyAnswerOptionCollection()
  const order: string[] = Array.isArray(answerValue?.ORDER)
    ? answerValue.ORDER
    : []

  if (order.length === 0) {
    return <span className="text-base text-muted-foreground">—</span>
  }

  const unrankedOptions = answerOptions.filter(
    (opt: SurveyAnswerOption) => !order.includes(opt.code),
  )

  return (
    <div className="space-y-1">
      {order.map((code: string, i: number) => {
        const option =
          answerOptions.find?.((o: SurveyAnswerOption) => o.code === code) ??
          answerOptions.getByCode?.(code)
        const label = option?.label ? option.label.getLang(lang, 'en') : code
        return (
          <div key={code} className="flex items-center gap-2">
            <Badge variant="secondary" className="w-6 justify-center shrink-0">
              {i + 1}
            </Badge>
            <span className="text-sm">{label}</span>
          </div>
        )
      })}
      {unrankedOptions.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Not ranked:{' '}
          {unrankedOptions
            .map(
              (opt: SurveyAnswerOption) =>
                opt.label?.getLang(lang, 'en') ?? opt.code,
            )
            .join(', ')}
        </div>
      )}
    </div>
  )
}
