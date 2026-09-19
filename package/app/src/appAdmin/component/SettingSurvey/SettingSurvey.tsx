import React from 'react'
import {
  SettingSurvey as SettingSurveyType,
  EmailTemplate,
  EmailTemplateCollection,
} from 'veysur-common'

import {
  BaseSettingsStandalone,
  SettingSurveyAdapter,
  ContentRenderer,
} from 'appAdmin/component/SurveySettingShared'

type EmailTemplateProps = {
  emailTemplates?: Map<string, EmailTemplate>
  projectTemplates?: EmailTemplateCollection
  systemTemplates?: EmailTemplateCollection
  availableLanguages?: string[]
  defaultLanguage?: string
  onEmailTemplateChange?: (
    type: string,
    lang: string,
    field: 'subject' | 'body',
    value: string | null,
  ) => void
}

type Props = {
  settingSurvey: SettingSurveyType
  activeSection?: string
  onSectionChange?: (section: string) => void
  handleBooleanChange: (
    section: string,
    field: string,
    value: string | null,
  ) => void
  handleStringChange: (
    section: string,
    field: string,
    value: string | null,
  ) => void
  handleNumberChange: (
    section: string,
    field: string,
    value: string | null,
  ) => void
  handleL10nChange: (
    section: string,
    field: string,
    value: string | null,
  ) => void
  handleLanguageOptionsChange: (selectedLanguages: string[]) => void
  emailTemplateProps?: EmailTemplateProps
  header?: React.ReactNode
}

export const SettingSurvey: React.FC<Props> = ({
  settingSurvey,
  activeSection,
  onSectionChange,
  handleBooleanChange,
  handleStringChange,
  handleNumberChange,
  handleL10nChange,
  handleLanguageOptionsChange,
  emailTemplateProps,
  header,
}) => {
  const data = new SettingSurveyAdapter(settingSurvey)
  const handlers = {
    handleBooleanChange,
    handleStringChange,
    handleNumberChange,
    handleL10nChange,
    handleLanguageOptionsChange,
  }

  return (
    <BaseSettingsStandalone
      data={data}
      handlers={handlers}
      renderSectionContent={ContentRenderer}
      className="survey-setting-settings-enhanced"
      header={header}
      activeSection={activeSection}
      onSectionChange={onSectionChange}
      emailTemplateProps={emailTemplateProps}
    />
  )
}
