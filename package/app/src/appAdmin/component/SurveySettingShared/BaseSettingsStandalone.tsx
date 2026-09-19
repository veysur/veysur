import React, { useState } from 'react'
import { EmailTemplate, EmailTemplateCollection } from 'veysur-common'

import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'
import { SettingsLayout } from './SettingsLayout'
import { SettingsContent } from './SettingsContent'

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

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers
  renderSectionContent: (
    tabKey: string,
    data: SettingsDataAdapter<T>,
    handlers: SettingsHandlers & { YES: string; NO: string },
    emailProps?: EmailTemplateProps,
  ) => React.ReactNode
  className?: string
  header?: React.ReactNode
  activeSection?: string
  onSectionChange?: (section: string) => void
  emailTemplateProps?: EmailTemplateProps
}

export function BaseSettingsStandalone<T>({
  data,
  handlers,
  renderSectionContent,
  className = 'survey-settings-enhanced',
  header,
  activeSection: activeSection_prop,
  onSectionChange: onSectionChange_prop,
  emailTemplateProps,
}: Props<T>) {
  const [activeSection_state, setActiveSection_state] = useState('language')

  const activeSection = activeSection_prop ?? activeSection_state
  const onSectionChange = onSectionChange_prop ?? setActiveSection_state

  return (
    <SettingsLayout
      activeSection={activeSection}
      onSectionChange={onSectionChange}
      header={header}
    >
      <SettingsContent
        data={data}
        handlers={handlers}
        renderSectionContent={renderSectionContent}
        className={className}
        activeSection={activeSection}
        emailTemplateProps={emailTemplateProps}
      />
    </SettingsLayout>
  )
}
