import React from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from 'component/shadcn/button'

import type { SurveyPresentationConfig } from './SurveyTypes'

type Props = {
  format: string
  presentation: SurveyPresentationConfig
  currentGroupIndex: number
  currentQuestionIndex: number
  canGoBack: boolean
  isLastView: boolean
  onContinue: () => void
  onBack: () => void
  onSubmit: () => void
  countdown: number
}

export const SurveyNavigation: React.FC<Props> = ({
  format,
  presentation,
  canGoBack,
  isLastView,
  onContinue,
  onBack,
  onSubmit,
  countdown,
}) => {
  const { t } = useTranslation('app-survey')

  if (format === 'all') {
    return (
      <div className="survey-navigation-all flex justify-center">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={countdown > 0}
          className="survey-submit-btn"
        >
          {countdown > 0 ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('nav.submitCountdown', { seconds: countdown })}
            </>
          ) : (
            <>
              {t('nav.submitSurvey')}
              <CheckCircle className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="survey-navigation-container mt-6">
      <div className="survey-navigation-buttons flex justify-between items-center">
        {presentation.backNav && canGoBack ? (
          <Button
            variant="outline"
            onClick={onBack}
            className="survey-back-btn"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('nav.back')}
          </Button>
        ) : (
          <div></div>
        )}

        {isLastView ? (
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={countdown > 0}
            className="survey-submit-btn"
          >
            {countdown > 0 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('nav.submitCountdown', { seconds: countdown })}
              </>
            ) : (
              <>
                {t('nav.submitSurvey')}
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={onContinue}
            disabled={countdown > 0}
            className="survey-continue-btn"
          >
            {countdown > 0 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('nav.continueCountdown', { seconds: countdown })}
              </>
            ) : (
              <>
                {t('nav.continue')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
