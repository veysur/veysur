import React, { useMemo, useCallback } from 'react'
import { BUFFERED_PATCH_ACTION_UPDATE, L10n } from 'veysur-common'

import {
  BaseSettingsNested,
  ContentRenderer,
} from 'appAdmin/component/SurveySettingShared'

import { useLatestRef } from 'hook'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'
import { useSurveyEmailTemplates } from 'appAdmin/component/SurveySettingShared'
import { createSettingsHandlers } from 'appAdmin/hook/useSettingsPageLogic'

type Props = {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export const SurveySetting: React.FC<Props> = ({
  activeSection,
  onSectionChange,
}) => {
  const surveyAdapter = useSurveyEditorStore((state) => state.surveyAdapter)
  const survey = surveyAdapter?.source
  const operations = useSurveyEditorStore((state) => state.operations)

  // Fetch email templates independently from survey
  const {
    templateCollection,
    projectTemplates,
    systemTemplates,
    bufferPatches: bufferEmailTemplatePatches,
    isLoading: emailTemplatesLoading,
  } = useSurveyEmailTemplates(survey?._id)

  // Use refs to avoid recreating callbacks
  const templateCollectionRef = useLatestRef(templateCollection)
  const projectTemplatesRef = useLatestRef(projectTemplates)

  // Get available languages
  const availableLanguages = useMemo(
    () => survey?.language?.options || [],
    [survey?.language?.options],
  )

  const defaultLanguage = survey?.language?.default || 'en'

  // Handler for email template changes
  const handleEmailTemplateChange = useCallback(
    (
      type: string,
      lang: string,
      field: 'subject' | 'body',
      value: string | null,
    ) => {
      const key = `${type}-${lang}`

      // Get current templates from the collection (most up-to-date)
      const currentTemplate = templateCollectionRef.current?.get(type, lang)
      const defaultTemplate = projectTemplatesRef.current?.getByKey(key)

      // When value is null, it signals to revert to default (backend will delete the template)
      if (value === null) {
        // Buffer patch to delete the template (both subject and body null = delete)
        bufferEmailTemplatePatches([
          {
            type: 'emailTemplate',
            action: BUFFERED_PATCH_ACTION_UPDATE,
            data: {
              type,
              lang,
              subject: null,
              body: null,
            },
          },
        ])
      } else {
        // Determine the values to send
        const subject =
          field === 'subject'
            ? value
            : (currentTemplate?.subject ?? defaultTemplate?.subject ?? null)

        const body =
          field === 'body'
            ? value
            : (currentTemplate?.body ?? defaultTemplate?.body ?? null)

        // Buffer patch to update the template
        bufferEmailTemplatePatches([
          {
            type: 'emailTemplate',
            action: BUFFERED_PATCH_ACTION_UPDATE,
            data: {
              type,
              lang,
              subject,
              body,
            },
          },
        ])
      }
    },
    [bufferEmailTemplatePatches, templateCollectionRef, projectTemplatesRef],
  )

  const handlers = useMemo(() => {
    if (!survey || !operations) return null

    return createSettingsHandlers({
      updateLanguageProperty: (field, value) => {
        if (field === 'default' && typeof value === 'string' && value) {
          useSurveyEditorStore.getState().setLangDefault(value)
        }
        operations?.updateSurvey({
          language: { ...survey.language, [field]: value },
        })
      },
      updatePresentationProperty: (field, value) =>
        operations?.updateSurveyPresentationSetting(field, value),
      updateParticipantProperty: (field, value) =>
        operations?.updateSurveyParticipantSetting(field, value),
      updateDataProperty: (field, value) =>
        operations?.updateSurveyDataSetting(field, value),
      updateAccessProperty: (field, value) =>
        operations?.updateSurveyAccessSetting(field, value),
      updateDataPolicyProperty: (field, value) =>
        operations?.updateSurveyDataPolicySetting(
          field,
          value as boolean | L10n,
        ),
      updateLegalNoticeProperty: (field, value) =>
        operations?.updateSurveyLegalNoticeSetting(field, value),
      updateNotifyProperty: (field, value) =>
        operations?.updateSurveyNotifySetting(field, value),
      updateScheduleProperty: (field, value) =>
        operations?.updateSurveyScheduleSetting(field, value),
      updateContentFormatProperty: (field, value) =>
        operations?.updateSurveyContentFormatSetting(field, value),
      updateDataPolicyText: (value, language) => {
        const lang = language || survey.language?.default || 'en'
        operations?.updateSurveyDataPolicyText(value, lang)
      },
      updateLegalNoticeText: (value, language) => {
        const lang = language || survey.language?.default || 'en'
        operations?.updateSurveyLegalNoticeText(value, lang)
      },
      updateLanguageOptions: (selectedLanguages) =>
        operations?.updateSurvey({
          language: { ...survey.language, options: selectedLanguages },
        }),
    })
  }, [survey, operations])

  if (!surveyAdapter || !handlers) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading survey settings...</p>
      </div>
    )
  }

  return (
    <BaseSettingsNested
      data={surveyAdapter}
      handlers={handlers}
      renderSectionContent={ContentRenderer}
      className="survey-settings-enhanced"
      activeSection={activeSection}
      onSectionChange={onSectionChange}
      emailTemplateProps={{
        emailTemplates: templateCollection?.getAll(),
        projectTemplates,
        systemTemplates,
        availableLanguages,
        defaultLanguage,
        onEmailTemplateChange: handleEmailTemplateChange,
        isLoading: emailTemplatesLoading,
      }}
    />
  )
}
