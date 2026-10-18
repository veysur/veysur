import { EmailTemplate, EmailTemplateCollection } from 'veysur-common'

import { DefaultableEmailTemplateSettings } from 'appAdmin/component/SurveySettingShared'

import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'
import { BaseLanguageSettings } from './BaseLanguageSettings'
import { BasePresentationSettings } from './BasePresentationSettings'
import { BaseParticipantSettings } from './BaseParticipantSettings'
import { BaseDataSettings } from './BaseDataSettings'
import { BaseAccessSettings } from './BaseAccessSettings'
import { BaseContentSettings } from './BaseContentSettings'
import { BaseScheduleSettings } from './BaseScheduleSettings'
import { BaseDataPolicySettings } from './BaseDataPolicySettings'
import { BaseLegalNoticeSettings } from './BaseLegalNoticeSettings'
import { BaseNotifySettings } from './BaseNotifySettings'

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

export function ContentRenderer<T>(
  tabKey: string,
  data: SettingsDataAdapter<T>,
  handlers: SettingsHandlers & { YES: string; NO: string },
  emailProps?: EmailTemplateProps,
) {
  switch (tabKey) {
    case 'language':
      return <BaseLanguageSettings data={data} handlers={handlers} />

    case 'presentation':
      return <BasePresentationSettings data={data} handlers={handlers} />

    case 'participant':
      return <BaseParticipantSettings data={data} handlers={handlers} />

    case 'data':
      return <BaseDataSettings data={data} handlers={handlers} />

    case 'access':
      return <BaseAccessSettings data={data} handlers={handlers} />

    case 'contentFormat':
      return <BaseContentSettings data={data} handlers={handlers} />

    case 'schedule':
      return <BaseScheduleSettings data={data} handlers={handlers} />

    case 'dataPolicy':
      return (
        <BaseDataPolicySettings
          data={data}
          handlers={handlers}
          YES={handlers.YES}
          NO={handlers.NO}
        />
      )

    case 'legalNotice':
      return (
        <BaseLegalNoticeSettings
          data={data}
          handlers={handlers}
          YES={handlers.YES}
          NO={handlers.NO}
        />
      )

    case 'notify':
      return <BaseNotifySettings data={data} handlers={handlers} />

    case 'emailTemplates':
      if (
        !emailProps?.emailTemplates ||
        !emailProps?.availableLanguages ||
        !emailProps?.defaultLanguage ||
        !emailProps?.onEmailTemplateChange
      ) {
        return <div>Loading email templates...</div>
      }

      // Use DefaultableEmailTemplateSettings for both project and survey contexts
      // - Project context: projectTemplates is undefined, systemTemplates provides defaults
      // - Survey context: projectTemplates is defined, systemTemplates provides fallback
      return (
        <DefaultableEmailTemplateSettings
          surveyTemplates={emailProps.emailTemplates}
          projectTemplates={
            emailProps.projectTemplates || EmailTemplateCollection.fromArray([])
          }
          systemTemplates={emailProps.systemTemplates}
          availableLanguages={emailProps.availableLanguages}
          defaultLanguage={emailProps.defaultLanguage}
          onTemplateChange={emailProps.onEmailTemplateChange}
        />
      )

    default:
      return <div>Tab not found</div>
  }
}
