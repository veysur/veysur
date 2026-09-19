import React from 'react'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from 'component/shadcn/accordion'
import { Survey } from 'veysur-common'

import { SurveyAnswersSummary } from 'component/SurveyResponse'

interface AnswersSectionProps {
  snapshotData: {
    survey?: Pick<Survey, 'elements' | 'language'>
  }
  answers: Record<string, unknown>
}

export const AnswersSection: React.FC<AnswersSectionProps> = ({
  snapshotData,
  answers,
}) => {
  const lang = snapshotData?.survey?.language?.default || 'en'

  return (
    <AccordionItem value="answers" className="border rounded-lg">
      <AccordionTrigger className="px-6 hover:no-underline">
        <h3 className="text-lg font-semibold">Answers</h3>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        {snapshotData?.survey ? (
          <SurveyAnswersSummary
            survey={snapshotData.survey}
            answers={answers}
            lang={lang}
          />
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No questions found in this survey snapshot
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
