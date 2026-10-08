import { useCallback, useRef } from 'react'

import {
  getAuthParticipantApi,
  getSurveyParticipantResponseApi,
} from 'appSurvey/registry'
import type { SurveyAnswers } from 'component/Survey/SurveyTypes'
import { ErrorRest } from 'model'

// Authenticates on the first real answer, never on page view, and serialises
// saves so an older save cannot overwrite a newer one.
export function useEmbedResponseSaver(surveyId: string, embedOrigin: string) {
  const jwtPromiseRef = useRef<Promise<string> | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const seedsRef = useRef<Record<string, number>>({})

  const ensureJwt = useCallback(() => {
    if (!jwtPromiseRef.current) {
      jwtPromiseRef.current = getAuthParticipantApi()
        .authenticate(surveyId, undefined, undefined, embedOrigin)
        .then((response) => response.jwt)
        .catch((error) => {
          jwtPromiseRef.current = null
          throw error
        })
    }
    return jwtPromiseRef.current
  }, [surveyId, embedOrigin])

  return useCallback(
    async (
      answers: SurveyAnswers,
      completed?: boolean,
      seeds?: Record<string, number>,
      language?: string,
    ) => {
      seedsRef.current = { ...seedsRef.current, ...seeds }

      // Randomised questions report their seeds as soon as they render. Hold
      // them until there is a real answer to save them with.
      const hasAnswer = !!completed || Object.keys(answers ?? {}).length > 0
      if (!hasAnswer && !jwtPromiseRef.current) {
        return
      }

      const run = queueRef.current.then(async () => {
        const jwt = await ensureJwt()
        await getSurveyParticipantResponseApi().saveResponse(
          surveyId,
          {
            answers,
            randomSeeds: seedsRef.current,
            completedAt: completed,
            language,
          },
          jwt,
        )
      })
      queueRef.current = run.catch(() => undefined)

      try {
        await run
      } catch (error) {
        throw new Error(
          error instanceof ErrorRest && error.userMessage
            ? error.userMessage
            : 'We were not able to save your answers. Please try again.',
          { cause: error },
        )
      }
    },
    [surveyId, ensureJwt],
  )
}
