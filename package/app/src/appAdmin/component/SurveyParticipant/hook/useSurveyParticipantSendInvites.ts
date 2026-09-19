import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

export type SendEmailResult = {
  queued: number
  errors: number
}

export type SendEmailProgressData = {
  type: 'progress' | 'complete'
  queued: number
  errors: number
  total?: number
  batchErrors?: Array<{ email: string; message: string }>
  message?: string
}

export function useSurveyParticipantSendEmail(
  surveyId: string,
  emailType: 'invite' | 'reminder',
) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async ({
      onProgress,
    }: {
      onProgress?: (data: SendEmailProgressData) => void
    }): Promise<SendEmailResult> => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      const api = getSurveyParticipantApi()
      const result =
        emailType === 'invite'
          ? await api.sendInvites(surveyId, onProgress)
          : await api.sendReminders(surveyId, onProgress)

      return result
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_LIST]],
  })

  return {
    sendEmail: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    result: mutation.data,
  }
}

// Convenience hooks for backward compatibility and cleaner usage
export function useSurveyParticipantSendInvites(surveyId: string) {
  const hook = useSurveyParticipantSendEmail(surveyId, 'invite')
  return {
    sendInvites: hook.sendEmail,
    isLoading: hook.isLoading,
    error: hook.error,
    result: hook.result,
  }
}

export function useSurveyParticipantSendReminders(surveyId: string) {
  const hook = useSurveyParticipantSendEmail(surveyId, 'reminder')
  return {
    sendReminders: hook.sendEmail,
    isLoading: hook.isLoading,
    error: hook.error,
    result: hook.result,
  }
}
