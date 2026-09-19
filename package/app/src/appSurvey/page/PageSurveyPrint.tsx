import React, { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18next from '../i18n'

import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { PageMessage } from 'component/PageMessage'
import {
  SurveyPageContainer,
  SurveyPrintView,
  SurveySuccessCard,
} from 'component/Survey'
import { usePageTitle } from 'hook'

import { resolveUiLanguage } from '../common'
import { useSurveyAuth, ERROR_INVALID_TOKEN } from '../hook/useSurveyAuth'
import { useSurveyParticipantSnapshotPublished } from '../hook/useSurveyParticipantSnapshotPublished'
import { useSurveyParticipantResponse } from '../hook/useSurveyParticipantResponse'
import { TokenEntryForm } from '../component/TokenEntryForm'

export const PageSurveyPrint: React.FC = () => {
  const { t } = useTranslation('app-survey')
  const { surveyId, token } = useParams<{ surveyId: string; token?: string }>()
  const [searchParams] = useSearchParams()
  const initLanguage = searchParams.get('lang') || undefined

  const authResult = useSurveyAuth(surveyId, token)
  const { survey, loading, error } = useSurveyParticipantSnapshotPublished(
    surveyId,
    authResult.jwt,
    initLanguage,
  )
  const {
    response,
    isLoading: isLoadingResponse,
    error: responseError,
  } = useSurveyParticipantResponse(surveyId, authResult.jwt)

  usePageTitle(t('print.title'), { suffix: survey?.name || 'Veysur' })

  // Match the UI chrome to the print content language (the ?lang= param, or
  // the survey default) once the survey has loaded.
  const surveyDefaultLanguage = survey?.language?.default
  useEffect(() => {
    if (!survey) return
    i18next.changeLanguage(
      resolveUiLanguage(initLanguage, surveyDefaultLanguage),
    )
  }, [survey, initLanguage, surveyDefaultLanguage])

  const backLink = `/${surveyId}${token ? `/${token}` : ''}`

  if (authResult.isLoading || loading || isLoadingResponse) {
    return (
      <SurveyPageContainer>
        <PageMessage title={t('page.loading')} />
      </SurveyPageContainer>
    )
  }

  if (authResult.error?.ref === ERROR_INVALID_TOKEN) {
    return (
      <TokenEntryForm
        surveyId={surveyId!}
        error={token ? authResult.error.userMessage : undefined}
      />
    )
  }

  if (authResult.error || error) {
    return (
      <SurveyPageContainer>
        <Alert variant="destructive">
          <AlertTitle>{t('page.error')}</AlertTitle>
          <AlertDescription>
            {authResult.error?.userMessage ||
              error ||
              t('page.authenticationErrorGeneric')}
          </AlertDescription>
        </Alert>
      </SurveyPageContainer>
    )
  }

  const printNotAvailable =
    !survey?.presentation?.print || !response?.completed || responseError

  if (printNotAvailable) {
    return (
      <SurveyPageContainer>
        <SurveySuccessCard>
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              {t('print.notAvailable')}
            </p>
            <Button asChild variant="outline">
              <Link to={backLink}>{t('print.backToSurvey')}</Link>
            </Button>
          </div>
        </SurveySuccessCard>
      </SurveyPageContainer>
    )
  }

  const lang = initLanguage || survey.language?.default || 'en'

  return (
    <SurveyPageContainer noBrand={survey.presentation?.noBrand === true}>
      <SurveyPrintView survey={survey} answers={response.answers} lang={lang} />
    </SurveyPageContainer>
  )
}

export default PageSurveyPrint
