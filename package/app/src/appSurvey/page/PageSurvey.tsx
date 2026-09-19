import React, { useEffect, useRef, useCallback } from 'react'
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18next from '../i18n'

import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { PageMessage } from 'component/PageMessage'
import {
  Survey,
  SurveyPageContainer,
  SurveySuccessCard,
  SurveyUnavailableCard,
} from 'component/Survey'
import type { SurveyAnswers } from 'component/Survey/SurveyTypes'
import { usePageTitle } from 'hook'

import { TokenEntryForm } from '../component/TokenEntryForm'
import { resolveUiLanguage } from '../common'
import { useSurveyParticipantSnapshotPublished } from '../hook/useSurveyParticipantSnapshotPublished'
import { useSurveyParticipantMe } from '../hook/useSurveyParticipantMe'
import {
  useSurveyAuth,
  ERROR_REG_REQUIRED,
  ERROR_INVALID_TOKEN,
  ERROR_SURVEY_NOT_STARTED,
  ERROR_SURVEY_ENDED,
} from '../hook/useSurveyAuth'
import {
  useSurveyResponsePersistence,
  ERROR_SURVEY_COMPLETED,
} from '../hook/useSurveyResponsePersistence'

export const PageSurvey: React.FC = () => {
  const { t } = useTranslation('app-survey')
  const { surveyId, token } = useParams<{ surveyId: string; token?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const initLanguage = searchParams.get('lang') || undefined
  const emailVerifyToken = searchParams.get('evt') || undefined
  const authResult = useSurveyAuth(surveyId, token, emailVerifyToken)
  const { survey, loading, error } = useSurveyParticipantSnapshotPublished(
    surveyId,
    authResult.jwt,
    initLanguage,
  )
  const noBrand = survey?.presentation?.noBrand === true

  const { participantData } = useSurveyParticipantMe(surveyId, authResult.jwt)

  // Reconcile the browser-detected default UI language with the
  // participant's stored preference once it becomes available. Applied only
  // once so it can't clobber a language the participant later picks manually
  // via the survey language selector (handleLanguageChange, below).
  const hasAppliedStoredLanguage = useRef(false)
  useEffect(() => {
    if (
      !hasAppliedStoredLanguage.current &&
      typeof participantData?.language === 'string'
    ) {
      i18next.changeLanguage(participantData.language)
      hasAppliedStoredLanguage.current = true
    }
  }, [participantData?.language])

  usePageTitle(survey?.name || 'Survey', { suffix: 'Veysur' })

  const {
    saveResponse,
    response,
    loadedResponse,
    loadError,
    isLoading: isLoadingResponse,
  } = useSurveyResponsePersistence({
    surveyId,
    authToken: authResult.jwt,
    enabled: !!authResult.jwt,
  })

  // The survey's content-language selector (rendered inside <Survey>, listing
  // survey.language.options) is the single language control on this page. It
  // also drives the UI chrome language: if the selected content language isn't
  // one of the languages appSurvey's UI is translated into, fall back to the
  // survey's default language, then to English.
  const handleLanguageChange = useCallback(
    (lang: string) => {
      setSearchParams({ lang }, { replace: true })

      i18next.changeLanguage(resolveUiLanguage(lang, survey?.language?.default))
    },
    [setSearchParams, survey?.language?.default],
  )

  const handlePrint = useCallback(() => {
    navigate(`/${surveyId}${token ? `/${token}` : ''}/print`)
  }, [navigate, surveyId, token])

  const handleSaveResponse = useCallback(
    async (
      answer: SurveyAnswers,
      completed?: boolean,
      seeds?: Record<string, number>,
      language?: string,
    ) => {
      await saveResponse(answer, completed, seeds, language)
    },
    [saveResponse],
  )

  useEffect(() => {
    if (authResult.error?.ref === ERROR_REG_REQUIRED) {
      navigate(`/${surveyId}/register${location.search}`, {
        replace: true,
      })
    }
  }, [authResult.error, surveyId, navigate, location.search])

  if (authResult.isLoading) {
    return (
      <SurveyPageContainer>
        <PageMessage title={t('page.authenticating')} />
      </SurveyPageContainer>
    )
  }

  if (authResult.error?.ref === ERROR_REG_REQUIRED) {
    return (
      <SurveyPageContainer>
        <PageMessage title={t('page.redirectingToRegistration')} />
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

  if (authResult.error?.ref === ERROR_SURVEY_NOT_STARTED) {
    return (
      <SurveyPageContainer>
        <SurveyUnavailableCard>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              {t('page.surveyUnavailableTitle')}
            </h2>
            <p className="text-muted-foreground">
              {t('page.surveyUnavailableBody')}
            </p>
          </div>
        </SurveyUnavailableCard>
      </SurveyPageContainer>
    )
  }

  if (authResult.error?.ref === ERROR_SURVEY_ENDED) {
    return (
      <SurveyPageContainer>
        <SurveyUnavailableCard>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              {t('page.surveyClosedTitle')}
            </h2>
            <p className="text-muted-foreground">
              {t('page.surveyClosedBody')}
            </p>
          </div>
        </SurveyUnavailableCard>
      </SurveyPageContainer>
    )
  }

  if (authResult.error) {
    // If a token was provided and authentication failed, show the token entry form
    // This allows the user to enter a different token instead of being stuck
    if (token) {
      return (
        <TokenEntryForm
          surveyId={surveyId!}
          error={authResult.error.userMessage || t('page.authenticationFailed')}
        />
      )
    }

    // For errors without a token (shouldn't normally happen), show generic error
    return (
      <SurveyPageContainer>
        <Alert variant="destructive">
          <AlertTitle>{t('page.authenticationError')}</AlertTitle>
          <AlertDescription>
            <p>
              {authResult.error.userMessage ||
                t('page.authenticationErrorGeneric')}
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                {t('page.tryAgain')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </SurveyPageContainer>
    )
  }

  if (isLoadingResponse) {
    return (
      <SurveyPageContainer>
        <div className="text-center">
          <div className="mb-4">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"
              role="status"
            >
              <span className="sr-only">{t('page.loading')}</span>
            </div>
          </div>
          <h4 className="text-muted-foreground">{t('page.preparingSurvey')}</h4>
        </div>
      </SurveyPageContainer>
    )
  }

  if (loadError?.ref === ERROR_SURVEY_COMPLETED) {
    return (
      <SurveyPageContainer>
        <SurveySuccessCard>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              {t('page.surveyCompletedTitle')}
            </h2>
            <p className="text-muted-foreground">
              {loadError.userMessage || t('page.surveyCompletedBody')}
            </p>
          </div>
        </SurveySuccessCard>
      </SurveyPageContainer>
    )
  }

  if (loading) {
    return <PageMessage title={t('page.loadingSurvey')} />
  }

  if (error) {
    return (
      <SurveyPageContainer>
        <Alert variant="destructive">
          <AlertTitle>{t('page.failedToLoadTitle')}</AlertTitle>
          <AlertDescription>
            <p className="mb-3">{t('page.failedToLoadBody')}</p>
            {error && (
              <details className="mb-3">
                <summary className="text-muted-foreground text-sm cursor-pointer">
                  {t('page.technicalDetails')}
                </summary>
                <pre className="mt-2 p-2 bg-muted border rounded text-sm text-destructive mb-0">
                  {error}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                {t('page.retry')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </SurveyPageContainer>
    )
  }

  return (
    <SurveyPageContainer noBrand={noBrand}>
      {authResult.reset && (
        <Alert variant="default" className="mb-3">
          <AlertTitle>{t('page.progressResetTitle')}</AlertTitle>
          <AlertDescription>{t('page.progressResetBody')}</AlertDescription>
        </Alert>
      )}
      <Survey
        survey={survey}
        authToken={authResult.jwt}
        participantData={participantData}
        initAnswers={response}
        initSeeds={loadedResponse?.randomSeeds}
        initLanguage={initLanguage}
        onSaveResponse={handleSaveResponse}
        onLanguageChange={handleLanguageChange}
        onPrint={handlePrint}
      />
    </SurveyPageContainer>
  )
}

export default PageSurvey
