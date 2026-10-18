import { useCallback } from 'react'
import {
  SettingSurvey,
  Patch,
  BUFFERED_PATCH_ACTION_UPDATE,
} from 'veysur-common'
import { useQueryClient } from '@tanstack/react-query'

import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'
import { useAuth, useProjectDomain } from 'appAdmin/hook'
import { getRestClient } from 'registry'

import { getSettingSurveyApi } from '../registry'
import { useSettingSurvey } from './useSettingSurvey'
import { ProjectEmailTemplateApi } from 'appAdmin/component/SurveySettingShared'
import {
  KEY_STATE_SETTING_SURVEY,
  KEY_STATE_SETTING_SURVEY_EDITING,
} from '../common/keyState'

type Props = {
  useSettingSurveyState: ReturnType<typeof useSettingSurvey>
}

export function useSettingSurveyOperations({ useSettingSurveyState }: Props) {
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const project = useProjectDomain()

  const {
    settingSurvey,
    isDirty,
    updateLocalSettingSurvey,
    resetToServer,
    markClean,
  } = useSettingSurveyState

  // Save mutation
  const saveMutation = useInvalidatingMutation({
    mutationFn: async (settingToSave: SettingSurvey) => {
      if (!auth?.accessToken?.token) {
        return Promise.reject('Authentication required')
      }
      if (!project?._id) {
        return Promise.reject('Invalid project ID')
      }

      const patches: Patch[] = [
        {
          type: 'settingSurvey',
          action: BUFFERED_PATCH_ACTION_UPDATE,
          data: { ...settingToSave },
        },
      ]

      return getSettingSurveyApi().patch(patches)
    },
    // Refetching also refreshes `effective`, which a saved maps key changes
    invalidateKeys: [
      [KEY_STATE_SETTING_SURVEY, project?._id],
      [KEY_STATE_SETTING_SURVEY_EDITING],
    ],
    onSuccess: () => markClean(),
  })

  // Save operation
  const save = useCallback((): Promise<void> => {
    if (settingSurvey && isDirty) {
      return saveMutation.mutateAsync(settingSurvey).then(() => undefined)
    }
    return Promise.resolve()
  }, [settingSurvey, isDirty, saveMutation])

  // Cancel/reset operation
  const cancel = useCallback(() => {
    resetToServer()
  }, [resetToServer])

  // Generic update method
  const updateSettingSurvey = useCallback(
    (updater: (s: SettingSurvey) => SettingSurvey) => {
      updateLocalSettingSurvey(updater)
    },
    [updateLocalSettingSurvey],
  )

  // Specific update methods following the same pattern as PageSettingSurvey
  const updateSettingSurveyPresentationProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) =>
        setting.setPresentationProperty(key, value),
      )
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyParticipantProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) =>
        setting.setParticipantProperty(key, value),
      )
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyDataProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) => setting.setDataProperty(key, value))
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyAccessProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) => setting.setAccessProperty(key, value))
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyDataPolicyProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) =>
        setting.setDataPolicyProperty(key, value),
      )
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyLegalNoticeProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) =>
        setting.setLegalNoticeProperty(key, value),
      )
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyLanguageProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) => setting.setLanguageProperty(key, value))
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyNotifyProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) => setting.setNotifyProperty(key, value))
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyMapsProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) => setting.setMapsProperty(key, value))
    },
    [updateSettingSurvey],
  )

  // `cloudflare.siteKey` style keys edit one field of a provider's key pair
  const updateSettingSurveyBotProtectionProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) => {
        const [provider, field] = key.split('.')
        if (field && (provider === 'cloudflare' || provider === 'google')) {
          return setting.setBotProtectionProperty(provider, {
            ...setting.botProtection?.[provider],
            [field]: value,
          })
        }
        return setting.setBotProtectionProperty(key, value)
      })
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyScheduleProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) => setting.setScheduleProperty(key, value))
    },
    [updateSettingSurvey],
  )

  const updateSettingSurveyContentFormatProperty = useCallback(
    (key: string, value: unknown) => {
      updateSettingSurvey((setting) =>
        setting.setContentFormatProperty(key, value),
      )
    },
    [updateSettingSurvey],
  )

  // L10n text updates
  const updateSettingSurveyDataPolicyText = useCallback(
    (value: string, lang?: string) => {
      const language = lang || settingSurvey?.language?.default || 'en'
      updateSettingSurvey((setting) =>
        setting.updateDataPolicyText(value, language),
      )
    },
    [updateSettingSurvey, settingSurvey],
  )

  const updateSettingSurveyLegalNoticeText = useCallback(
    (value: string, lang?: string) => {
      const language = lang || settingSurvey?.language?.default || 'en'
      updateSettingSurvey((setting) =>
        setting.updateLegalNoticeText(value, language),
      )
    },
    [updateSettingSurvey, settingSurvey],
  )

  const updateSettingSurveyDataPolicyUrl = useCallback(
    (value: string, lang?: string) => {
      const language = lang || settingSurvey?.language?.default || 'en'
      updateSettingSurvey((setting) =>
        setting.updateDataPolicyUrl(value, language),
      )
    },
    [updateSettingSurvey, settingSurvey],
  )

  const updateSettingSurveyLegalNoticeUrl = useCallback(
    (value: string, lang?: string) => {
      const language = lang || settingSurvey?.language?.default || 'en'
      updateSettingSurvey((setting) =>
        setting.updateLegalNoticeUrl(value, language),
      )
    },
    [updateSettingSurvey, settingSurvey],
  )

  // Email template operations (direct API calls, not part of SettingSurvey)
  const updateProjectEmailTemplate = useCallback(
    async (type: string, lang: string, subject: string, body: string) => {
      const patches: Patch[] = [
        {
          type: 'emailTemplate',
          action: BUFFERED_PATCH_ACTION_UPDATE,
          data: { type, lang, subject, body },
        },
      ]

      const api = new ProjectEmailTemplateApi(getRestClient())
      const result = await api.patch(patches)

      // Invalidate project email templates query
      await queryClient.invalidateQueries({
        queryKey: ['projectEmailTemplates', project?._id],
      })

      return result
    },
    [project?._id, queryClient],
  )

  // Create operations object similar to survey editor
  const operations = {
    updateSettingSurvey,
    updateSettingSurveyPresentationProperty,
    updateSettingSurveyParticipantProperty,
    updateSettingSurveyDataProperty,
    updateSettingSurveyAccessProperty,
    updateSettingSurveyDataPolicyProperty,
    updateSettingSurveyLegalNoticeProperty,
    updateSettingSurveyLanguageProperty,
    updateSettingSurveyNotifyProperty,
    updateSettingSurveyScheduleProperty,
    updateSettingSurveyMapsProperty,
    updateSettingSurveyBotProtectionProperty,
    updateSettingSurveyContentFormatProperty,
    updateSettingSurveyDataPolicyText,
    updateSettingSurveyLegalNoticeText,
    updateSettingSurveyDataPolicyUrl,
    updateSettingSurveyLegalNoticeUrl,
    updateProjectEmailTemplate,
  }

  return {
    operations,
    save,
    cancel,
    isDirty,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    isSuccess: saveMutation.isSuccess,
    saveMutation,
  }
}
