import React from 'react'
import { EmailTemplate, EmailTemplateCollection } from 'veysur-common'

import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'
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
  isLoading?: boolean
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
  activeSection?: string
  onSectionChange?: (section: string) => void
  emailTemplateProps?: EmailTemplateProps
}

export function BaseSettingsNested<T>({
  data,
  handlers,
  renderSectionContent,
  className = 'survey-settings-enhanced',
  activeSection = 'language',
  emailTemplateProps,
}: Props<T>) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <SettingsContent
        data={data}
        handlers={handlers}
        renderSectionContent={renderSectionContent}
        className={className}
        activeSection={activeSection}
        emailTemplateProps={emailTemplateProps}
      />
    </div>
  )
}
