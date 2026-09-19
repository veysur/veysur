import React, { useState } from 'react'

import { ChevronDownIcon } from '@radix-ui/react-icons'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'component/shadcn/collapsible'

interface MultiPartQuestionLike {
  subquestions?: {
    _id: string
    code: string
    type: string
    text?: { getLang: (lang: string, fallback: string) => string }
  }[]
}

interface MultiPartAnswerSummaryProps {
  question: MultiPartQuestionLike
  answerValue: Record<string, unknown> | null | undefined
  lang: string
  isPrint?: boolean
}

function formatPartValue(partType: string, partValue: unknown): string {
  if (partValue === null || partValue === undefined || partValue === '') {
    return '—'
  }
  if (partType === 'yesNo') {
    return partValue === true || partValue === 1 || partValue === '1'
      ? 'Yes'
      : 'No'
  }
  return String(partValue)
}

export const MultiPartAnswerSummary: React.FC<MultiPartAnswerSummaryProps> = ({
  question,
  answerValue,
  lang,
  isPrint = false,
}) => {
  const [open, setOpen] = useState(false)

  const parts = question.subquestions ?? []
  const data =
    typeof answerValue === 'object' && answerValue !== null ? answerValue : {}

  if (parts.length === 0) {
    return <span className="text-base text-muted-foreground">—</span>
  }

  const filledPartCount = parts.filter((part) => {
    const val = data[part.code]
    return val !== undefined && val !== null && val !== ''
  }).length

  const answerTable = (
    <div className="overflow-x-auto mt-2">
      <table className="border-collapse text-sm">
        <tbody>
          {parts.map((part) => (
            <tr key={part._id} className="border-t first:border-t-0">
              <td className="p-1 pe-4 whitespace-nowrap text-muted-foreground">
                {part.text?.getLang(lang, 'en') || part.code}
              </td>
              <td className="p-1">
                {formatPartValue(part.type, data[part.code])}
              </td>
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
          {filledPartCount} answers
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
        {filledPartCount} answers
      </CollapsibleTrigger>
      <CollapsibleContent>{answerTable}</CollapsibleContent>
    </Collapsible>
  )
}
