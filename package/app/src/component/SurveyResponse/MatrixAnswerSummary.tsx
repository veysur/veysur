import React, { useState } from 'react'

import { ChevronDownIcon } from '@radix-ui/react-icons'
import {
  ATTRIBUTE_MATRIX_ORIENTATION,
  MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS,
  MatrixResponseData,
  QUESTION_TYPE_YES_NO,
} from 'veysur-common'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'component/shadcn/collapsible'

interface MatrixAnswerOptionLike {
  _id: string
  code: string
  label?: { getLang: (lang: string, fallback: string) => string }
}

interface MatrixSubquestionLike {
  _id: string
  code: string
  type: string
  text?: { getLang: (lang: string, fallback: string) => string }
}

interface MatrixQuestionLike {
  attributes?: Record<string, unknown>
  answerOptions?: MatrixAnswerOptionLike[]
  subquestions?: MatrixSubquestionLike[]
}

interface MatrixAnswerSummaryProps {
  question: MatrixQuestionLike
  answerValue: MatrixResponseData | null | undefined
  lang: string
  isPrint?: boolean
}

export const MatrixAnswerSummary: React.FC<MatrixAnswerSummaryProps> = ({
  question,
  answerValue,
  lang,
  isPrint = false,
}) => {
  const [open, setOpen] = useState(false)

  const orientation =
    question?.attributes?.[ATTRIBUTE_MATRIX_ORIENTATION] ||
    MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS
  const answerOptions = question?.answerOptions || []
  const subquestions = question?.subquestions || []

  const data: MatrixResponseData =
    typeof answerValue === 'object' &&
    answerValue !== null &&
    !Array.isArray(answerValue)
      ? answerValue
      : {}

  const filledRowCount = Object.values(data).filter(
    (row) => row && Object.keys(row).length > 0,
  ).length

  const renderCellValue = (sqCode: string, aoCode: string, sqType: string) => {
    const val = data[sqCode]?.[aoCode]
    if (val === undefined || val === null || val === '') return '—'
    // A yes/no row's "No" is a real answer - show it, distinct from "—" (unset).
    if (sqType === QUESTION_TYPE_YES_NO) return val ? 'Yes' : 'No'
    if (typeof val === 'boolean') return val ? '✓' : '—'
    return String(val)
  }

  const answerTable = (
    <div className="overflow-x-auto mt-2">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <td className="p-1" />
            {orientation === 'b'
              ? answerOptions.map((ao: MatrixAnswerOptionLike) => (
                  <td key={ao._id} className="p-1 text-left whitespace-nowrap">
                    {ao.label?.getLang(lang, 'en')}
                  </td>
                ))
              : subquestions.map((sq: MatrixSubquestionLike) => (
                  <td key={sq._id} className="p-1 text-left whitespace-nowrap">
                    {sq.text?.getLang(lang, 'en')}
                  </td>
                ))}
          </tr>
        </thead>
        <tbody>
          {orientation === 'b'
            ? subquestions.map((sq: MatrixSubquestionLike) => (
                <tr key={sq._id} className="border-t">
                  <td className="p-1 whitespace-nowrap">
                    {sq.text?.getLang(lang, 'en')}
                  </td>
                  {answerOptions.map((ao: MatrixAnswerOptionLike) => (
                    <td key={ao._id} className="p-1 text-center">
                      {renderCellValue(sq.code, ao.code, sq.type)}
                    </td>
                  ))}
                </tr>
              ))
            : answerOptions.map((ao: MatrixAnswerOptionLike) => (
                <tr key={ao._id} className="border-t">
                  <td className="p-1 whitespace-nowrap">
                    {ao.label?.getLang(lang, 'en')}
                  </td>
                  {subquestions.map((sq: MatrixSubquestionLike) => (
                    <td key={sq._id} className="p-1 text-center">
                      {renderCellValue(sq.code, ao.code, sq.type)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )

  if (isPrint) {
    return (
      <div>
        <div className="text-sm text-muted-foreground">
          {filledRowCount} answers
        </div>
        {answerTable}
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
        {filledRowCount} answers
      </CollapsibleTrigger>
      <CollapsibleContent>{answerTable}</CollapsibleContent>
    </Collapsible>
  )
}
