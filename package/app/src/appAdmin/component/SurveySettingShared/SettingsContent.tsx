import React from 'react'
import { EmailTemplate, EmailTemplateCollection } from 'veysur-common'

import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'
import { settingsConfig, categoryConfig } from './settingsConfig'
import { SectionHeader } from 'component/SectionHeader'

const YES = 'Yes'
const NO = 'No'

type EmailTemplateProps = {
  emailTemplates?: Map<string, EmailTemplate>
  projectTemplates?: EmailTemplateCollection
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
  activeSection: string
  headerClassName?: string
  emailTemplateProps?: EmailTemplateProps
}

export function SettingsContent<T>({
  data,
  handlers,
  renderSectionContent,
  className = 'survey-settings-enhanced',
  activeSection,
  emailTemplateProps,
}: Props<T>) {
  const handlersWithConstants = {
    ...handlers,
    YES,
    NO,
  }

  const currentSection = settingsConfig.find((s) => s.key === activeSection)
  const currentCategory = currentSection
    ? categoryConfig[currentSection.category]
    : null

  return (
    <div className={className}>
      {currentSection && currentCategory && (
        <SectionHeader
          icon={currentSection.icon}
          title={currentSection.title}
          variant={currentCategory.variant}
          label={currentCategory.label}
          description={currentSection.description}
        />
      )}

      <div>
        {renderSectionContent(
          activeSection,
          data,
          handlersWithConstants,
          emailTemplateProps,
        )}
      </div>
    </div>
  )
}

export { YES, NO }
