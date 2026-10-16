import React, { Suspense, useCallback, useMemo, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { isEmbedOriginAllowed, surveyHasFileUpload } from 'veysur-common'

import '../../index.css'
import './embed.css'

import { queryClient } from 'common'
import { PageMessage } from 'component/PageMessage'
import {
  Survey,
  SurveyPageContainer,
  SurveySuccessCard,
  SurveyUnavailableCard,
} from 'component/Survey'
import type { SurveyAnswers } from 'component/Survey/SurveyTypes'

import { hasCompleted, markCompleted } from '../common/completedStorage'

import { getEmbedAncestorOrigin } from './embedAncestorOrigin'
import { embedScheduleState } from './embedScheduleState'
import { parseEmbedPath } from './embedPaths'
import { useEmbedResize } from './useEmbedResize'
import { useEmbedTheme } from './useEmbedTheme'
import { useEmbedResponseSaver } from './useEmbedResponseSaver'
import { useSurveyEmbed } from './useSurveyEmbed'

const Unavailable: React.FC<{
  title: string
  body?: string
  link?: { href: string; label: string }
}> = ({ title, body, link }) => (
  <SurveyPageContainer noBrand>
    <SurveyUnavailableCard>
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        {body && <p className="text-muted-foreground">{body}</p>}
        {link && (
          <a href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        )}
      </div>
    </SurveyUnavailableCard>
  </SurveyPageContainer>
)

const EmbedSurvey: React.FC<{
  projectId: string
  surveyId: string
  lang?: string
}> = ({ projectId, surveyId, lang }) => {
  const { t } = useTranslation('app-survey')
  const { pointer, survey, settingSurvey, isLoading, isError } = useSurveyEmbed(
    projectId,
    surveyId,
    lang,
  )
  const embedOrigin = useMemo(
    () =>
      getEmbedAncestorOrigin(
        window.location.ancestorOrigins,
        document.referrer,
      ),
    [],
  )
  const [loadedAt] = useState(Date.now)
  const saveResponse = useEmbedResponseSaver(surveyId, embedOrigin)
  useEmbedResize(surveyId)

  const preventRepeat = settingSurvey?.access?.preventRepeat === true
  // Read once per survey load, not on the cookie write at completion, so
  // finishing it in this visit keeps showing the survey's own thank-you screen.
  const completedBefore = useMemo(
    () => preventRepeat && hasCompleted(surveyId),
    [preventRepeat, surveyId],
  )

  const save = useCallback(
    async (
      answers: SurveyAnswers,
      completed?: boolean,
      seeds?: Record<string, number>,
      language?: string,
    ) => {
      await saveResponse(answers, completed, seeds, language)
      if (completed && preventRepeat) {
        markCompleted(surveyId)
      }
    },
    [saveResponse, preventRepeat, surveyId],
  )

  if (isLoading) {
    return <PageMessage title={t('page.loadingSurvey')} />
  }

  // Embedding needs an open survey, but settings can change after it was switched on
  if (
    isError ||
    !pointer ||
    !survey ||
    !pointer.access.embed ||
    !pointer.access.open ||
    pointer.access.publicReg
  ) {
    return (
      <Unavailable
        title={t('page.surveyUnavailableTitle')}
        body={t('page.surveyUnavailableBody')}
      />
    )
  }

  if (!isEmbedOriginAllowed(embedOrigin, pointer.access.embedDomains)) {
    return (
      <Unavailable
        title={t('embed.notAllowedTitle')}
        body={t('embed.notAllowedBody')}
      />
    )
  }

  const scheduleState = embedScheduleState(pointer.schedule, loadedAt)

  if (scheduleState === 'notStarted') {
    return (
      <Unavailable
        title={t('page.surveyUnavailableTitle')}
        body={t('page.surveyUnavailableBody')}
      />
    )
  }

  if (scheduleState === 'ended') {
    return (
      <Unavailable
        title={t('page.surveyClosedTitle')}
        body={t('page.surveyClosedBody')}
      />
    )
  }

  if (completedBefore) {
    return (
      <SurveyPageContainer noBrand={survey.presentation?.noBrand === true}>
        <SurveySuccessCard>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              {t('page.surveyCompletedTitle')}
            </h2>
            <p className="text-muted-foreground">
              {t('page.surveyCompletedBody')}
            </p>
          </div>
        </SurveySuccessCard>
      </SurveyPageContainer>
    )
  }

  if (surveyHasFileUpload(survey)) {
    return (
      <Unavailable
        title={t('embed.openSurveyBody')}
        link={{
          href: `${window.location.origin}/survey/${surveyId}`,
          label: t('embed.openSurveyLink'),
        }}
      />
    )
  }

  return (
    <SurveyPageContainer noBrand={survey.presentation?.noBrand === true}>
      <Survey
        survey={survey}
        settingSurvey={settingSurvey}
        authDeferred
        initLanguage={lang}
        onSaveResponse={save}
      />
    </SurveyPageContainer>
  )
}

export const EmbedApp: React.FC = () => {
  useEmbedTheme()
  const target = parseEmbedPath(window.location.pathname)
  const lang = new URLSearchParams(window.location.search).get('lang')

  return (
    <div data-testid="survey-embed-container">
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          {target ? (
            <EmbedSurvey {...target} lang={lang ?? undefined} />
          ) : (
            <PageMessage title="Survey not found" />
          )}
        </Suspense>
      </QueryClientProvider>
    </div>
  )
}

export default EmbedApp
