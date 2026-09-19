import { User, Folder } from 'lucide-react'
import {
  SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA,
  buildParticipantVariableEntries,
} from 'veysur-common'

import { DefaultableValueInput } from './DefaultableValueInput'
import { SettingsDataAdapter, SettingsHandlers } from './SettingSurveyAdapter'
import { Card, CardHeader, CardTitle, CardContent } from 'component/shadcn/card'
import {
  VariablePicker,
  VariablePickerGroup,
} from 'appAdmin/component/VariablePicker/VariablePicker'
import { appendVariableToken } from 'appAdmin/component/SurveySettingShared/emailTemplateVariables'

type Props<T> = {
  data: SettingsDataAdapter<T>
  handlers: SettingsHandlers
}

// Fixed, well-known variables always available regardless of survey - custom
// per-survey question/participant-attribute variables aren't enumerable here
// since notify settings can be edited at project-default level (no fixed
// survey/question set to enumerate against).
const VARIABLE_GROUPS: VariablePickerGroup[] = [
  {
    label: 'Participant',
    icon: User,
    entries: buildParticipantVariableEntries(
      Object.entries(SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA).map(
        ([name, meta]) => ({ name, label: meta.label }),
      ),
    ),
  },
  {
    label: 'Project',
    icon: Folder,
    entries: [{ path: 'projectOwner.email', label: 'Project owner email' }],
  },
]

export function BaseNotifySettings<T>({ data, handlers }: Props<T>) {
  const hasDefaults = !!data.getDefault

  const insertToken = (field: 'basic' | 'detailed') => (path: string) => {
    const current = data.notify?.[field] || ''
    handlers.handleStringChange?.(
      'notify',
      field,
      appendVariableToken(current, path),
    )
  }

  return (
    <form>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Email Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-3">
              <DefaultableValueInput
                label="Basic"
                type="text"
                currentValue={data.notify?.basic}
                defaultValue={data.getDefault?.('notify', 'basic') || ''}
                section="notify"
                field="basic"
                handler={handlers.handleStringChange!}
                hasDefaults={hasDefaults}
                helpText="Semicolon-separated recipients for basic notifications. Can use placeholders: {{projectOwner.email}}, {{participant.email}}, {{participant.attributeName}}, {{answers.QUESTION_CODE}}."
                className="flex-1 mb-0"
              />
              <VariablePicker
                groups={VARIABLE_GROUPS}
                onSelect={insertToken('basic')}
              />
            </div>

            <div className="flex items-end gap-2">
              <DefaultableValueInput
                label="Detailed"
                type="text"
                currentValue={data.notify?.detailed}
                defaultValue={data.getDefault?.('notify', 'detailed') || ''}
                section="notify"
                field="detailed"
                handler={handlers.handleStringChange!}
                hasDefaults={hasDefaults}
                helpText="Semicolon-separated recipients for detailed notifications. Same placeholder rules as basic notifications."
                className="flex-1 mb-0"
              />
              <VariablePicker
                groups={VARIABLE_GROUPS}
                onSelect={insertToken('detailed')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
