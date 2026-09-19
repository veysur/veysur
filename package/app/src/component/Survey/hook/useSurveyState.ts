import { useState, useEffect, useCallback } from 'react'
import {
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  SettingSurvey,
  type Survey,
} from 'veysur-common'

import { QUESTION_CODE_LANG } from 'component/constant'

import type { SurveyAnswers } from '../SurveyTypes'
import { debug } from '../debugUtils'

export interface UseSurveyStateProps {
  survey?: Survey
  settingSurvey?: SettingSurvey
  initAnswers?: SurveyAnswers
  initLanguage?: string
  /** Participant's stored profile language - applied once as a fallback
   * initial language when `initLanguage` (an explicit `?lang=` URL override)
   * wasn't given or isn't one of this survey's language options. Arrives
   * asynchronously (a separate fetch from the survey itself), so it's applied
   * via an effect rather than at initial state, and only if the participant
   * hasn't already manually picked a language in the meantime. */
  participantLanguage?: string
  onAnswersChange?: (answers: SurveyAnswers) => void
}

const isPropsObject = (
  value: Survey | undefined | UseSurveyStateProps,
): value is UseSurveyStateProps => value !== undefined && 'survey' in value

export const useSurveyState = (
  surveyOrProps: Survey | undefined | UseSurveyStateProps,
) => {
  const survey = isPropsObject(surveyOrProps)
    ? surveyOrProps.survey
    : surveyOrProps
  const settingSurvey =
    (isPropsObject(surveyOrProps) ? surveyOrProps.settingSurvey : undefined) ||
    new SettingSurvey()
  const initAnswers = isPropsObject(surveyOrProps)
    ? surveyOrProps.initAnswers
    : undefined
  const initLanguage = isPropsObject(surveyOrProps)
    ? surveyOrProps.initLanguage
    : undefined
  const participantLanguage = isPropsObject(surveyOrProps)
    ? surveyOrProps.participantLanguage
    : undefined
  const onAnswersChange = isPropsObject(surveyOrProps)
    ? surveyOrProps.onAnswersChange
    : undefined

  // Validate and determine initial language
  const languageConfig = survey?.getLanguage(settingSurvey) || {
    default: 'en',
    options: ['en'],
  }
  const langDefault = languageConfig.default
  const languageOptions = languageConfig.options
  const hasValidUrlLanguage =
    !!initLanguage && languageOptions.includes(initLanguage)
  const validatedInitialLanguage = hasValidUrlLanguage
    ? (initLanguage as string)
    : langDefault

  // The in-survey survey-language question (if any) stores its answer under
  // its own code, not the internal QUESTION_CODE_LANG pseudo-key - keep it in
  // sync with langCurrent so it shows a pre-selected value rather than blank.
  const surveyLangSelectQuestionCode = survey?.elements
    ? Array.from(survey.elements).find(
        (element) => element.type === QUESTION_TYPE_SURVEY_LANG_SELECT,
      )?.code
    : undefined
  const langAnswerKey = surveyLangSelectQuestionCode || QUESTION_CODE_LANG

  const [langCurrent, setLangCurrentState] = useState(validatedInitialLanguage)

  // Tracks whether the participant has manually picked a language (via the
  // survey's language selector) so the participant-language reconciliation
  // below never clobbers a deliberate choice that happens to race with the
  // participantLanguage fetch resolving.
  const [hasManuallyChangedLanguage, setHasManuallyChangedLanguage] =
    useState(false)
  const setLangCurrent = useCallback((lang: string) => {
    setHasManuallyChangedLanguage(true)
    setLangCurrentState(lang)
  }, [])

  // Reconcile with the participant's stored profile language once it becomes
  // available - it's a separate, asynchronous fetch from the survey itself,
  // so it can easily resolve after this hook's initial state is already set.
  // A `?lang=` URL override always wins; applied at most once, and never
  // after the participant has manually changed the language themselves. Runs
  // at render time (React's "adjusting state when a prop changes" pattern,
  // matching prevLangCurrent/prevInitAnswers below) rather than in an effect,
  // to avoid an extra render showing the pre-reconciliation language.
  const [hasAppliedParticipantLanguage, setHasAppliedParticipantLanguage] =
    useState(false)
  const [prevParticipantLanguage, setPrevParticipantLanguage] =
    useState(participantLanguage)
  if (participantLanguage !== prevParticipantLanguage) {
    setPrevParticipantLanguage(participantLanguage)
    if (
      !hasValidUrlLanguage &&
      !hasAppliedParticipantLanguage &&
      !hasManuallyChangedLanguage &&
      participantLanguage &&
      languageOptions.includes(participantLanguage)
    ) {
      setHasAppliedParticipantLanguage(true)
      setLangCurrentState(participantLanguage)
    }
  }

  const [countdown, setCountdown] = useState(0)
  const [answers, setAnswers] = useState<SurveyAnswers>(() => ({
    [langAnswerKey]: langCurrent,
    ...initAnswers,
  }))

  // Both syncs below run at render time (React's "adjusting state when a
  // prop changes" pattern) rather than in an effect, to avoid an extra
  // render showing answers that don't yet reflect the current language or
  // freshly-loaded initial answers.

  const [prevLangCurrent, setPrevLangCurrent] = useState(langCurrent)
  if (langCurrent !== prevLangCurrent) {
    setPrevLangCurrent(langCurrent)
    setAnswers((prev) => ({
      ...prev,
      [langAnswerKey]: langCurrent,
    }))
  }

  // Sync initAnswers when they change (e.g., loaded from API)
  // Only update answers that don't already exist to avoid overwriting user input
  const [prevInitAnswers, setPrevInitAnswers] = useState(initAnswers)
  if (
    initAnswers &&
    Object.keys(initAnswers).length > 0 &&
    initAnswers !== prevInitAnswers
  ) {
    setPrevInitAnswers(initAnswers)
    setAnswers((prev) => ({ ...initAnswers, ...prev }))
  }

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleAnswerChange = (questionCode: string, value: unknown) => {
    debug('Answer changed:', questionCode, value)
    setAnswers((prev) => {
      const newAnswers = {
        ...prev,
        [questionCode]: value,
      }
      onAnswersChange?.(newAnswers)
      return newAnswers
    })
  }

  return {
    langCurrent,
    setLangCurrent,
    langDefault,
    countdown,
    setCountdown,
    answers,
    setAnswers,
    handleAnswerChange,
  }
}
