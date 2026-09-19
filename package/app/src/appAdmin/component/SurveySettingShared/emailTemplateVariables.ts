import { User, ClipboardList, Folder } from 'lucide-react'
import {
  SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA,
  buildParticipantVariableEntries,
} from 'veysur-common'

import { VariablePickerGroup } from 'appAdmin/component/VariablePicker/VariablePicker'

// Fixed, well-known variables always available regardless of survey - custom
// per-survey question variables aren't enumerable here since email templates
// can be edited at project-default level (no fixed survey/question set to
// enumerate against).
export const EMAIL_VARIABLE_GROUPS: VariablePickerGroup[] = [
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
    label: 'Survey',
    icon: ClipboardList,
    entries: [
      { path: 'survey.name', label: 'Survey name' },
      { path: 'survey.link', label: 'Survey link' },
    ],
  },
  {
    label: 'Project',
    icon: Folder,
    entries: [{ path: 'project.name', label: 'Project name' }],
  },
]

export const emailTypes = [
  { key: 'invite', label: 'Invitation' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'thankYou', label: 'Thank You' },
  { key: 'adminBasic', label: 'Admin Basic' },
  { key: 'adminDetail', label: 'Admin Detail' },
]

export function appendVariableToken(current: string, path: string): string {
  return `${current}{{${path}}}`
}
