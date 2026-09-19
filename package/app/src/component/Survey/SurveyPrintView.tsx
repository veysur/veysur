import React from 'react'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { Survey as SurveyEntity } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { SurveyAnswersSummary } from 'component/SurveyResponse'

type Props = {
  survey: Pick<SurveyEntity, 'elements' | 'language'>
  answers: Record<string, unknown>
  lang: string
}

export const SurveyPrintView: React.FC<Props> = ({ survey, answers, lang }) => {
  const { t } = useTranslation('app-survey')

  return (
    <div className="survey-print-page">
      <div className="print:hidden flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t('print.title')}</h1>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          {t('print.button')}
        </Button>
      </div>

      <SurveyAnswersSummary
        survey={survey}
        answers={answers}
        lang={lang}
        isPrint
      />
    </div>
  )
}

export default SurveyPrintView
