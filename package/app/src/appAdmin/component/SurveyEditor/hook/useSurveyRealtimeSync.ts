import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  REALTIME_EVENT_SURVEY_CHANGED,
  type RealtimeSurveyChangedPayload,
} from 'veysur-common'

import { KEY_STATE_SURVEY_EDITING } from 'appAdmin/common'
import { getSocketClient } from 'registry'

/**
 * Refetches the survey when another editor changes it. Joins the survey's
 * realtime room while mounted; a reconnect refetches to catch missed changes.
 * Our own saves are skipped: usePatchableState already reloads after those.
 */
export function useSurveyRealtimeSync(projectId?: string, surveyId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId || !surveyId) {
      return
    }
    const client = getSocketClient()
    const invalidate = () =>
      queryClient.invalidateQueries({
        queryKey: [KEY_STATE_SURVEY_EDITING, surveyId],
      })

    const leave = client.joinSurveyRoom(projectId, surveyId)
    const offEvent = client.onEvent((event) => {
      if (event.type !== REALTIME_EVENT_SURVEY_CHANGED) {
        return
      }
      const payload = event.payload as RealtimeSurveyChangedPayload
      if (
        payload.surveyId === surveyId &&
        payload.originClientId !== client.clientId
      ) {
        invalidate()
      }
    })
    const offConnect = client.onConnect(invalidate)
    return () => {
      leave()
      offEvent()
      offConnect()
    }
  }, [projectId, surveyId, queryClient])
}
