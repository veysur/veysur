// Compile-time guard, checked by `pnpm typecheck` and never run: a migrated
// model must not contain an `any` field. A bare `sb.object()` / `sb.array()`
// infers `any`, so a schema can compile while a field silently loses its type.
// Add each model migrated to inferred types to `Migrated`.
import type { DataTransferJob } from './DataTransferJob'
import type { EmailSuppression } from './EmailSuppression'
import type { EmailTemplate } from './EmailTemplate'
import type { File } from './File'
import type { Notification } from './Notification'
import type { Project } from './Project'
import type { ProjectAdmin } from './ProjectAdmin'
import type { SurveyLanguage } from './SurveyLanguage'
import type { SurveyLanguageSnapshot } from './SurveyLanguageSnapshot'
import type { SurveyParticipant } from './SurveyParticipant'
import type { SurveyParticipantAttribute } from './SurveyParticipantAttribute'
import type { SurveyParticipantAttributeLanguage } from './SurveyParticipantAttributeLanguage'
import type { SurveyParticipantAttributeLanguageSnapshot } from './SurveyParticipantAttributeLanguageSnapshot'
import type { SurveyParticipantAttributeSnapshot } from './SurveyParticipantAttributeSnapshot'
import type { SurveyPublication } from './SurveyPublication'
import type { Task } from './Task'
import type { TaskExecution } from './TaskExecution'
import type { UserAccessToken } from './UserAccessToken'

type IsAny<T> = 0 extends 1 & T ? true : false

/** Names of the fields of `T` whose type is `any`. */
export type AnyKeys<T> = {
  [K in keyof T]-?: IsAny<T[K]> extends true ? K : never
}[keyof T]

type Migrated = {
  DataTransferJob: DataTransferJob
  EmailSuppression: EmailSuppression
  EmailTemplate: EmailTemplate
  File: File
  Notification: Notification
  Project: Project
  ProjectAdmin: ProjectAdmin
  SurveyLanguage: SurveyLanguage
  SurveyLanguageSnapshot: SurveyLanguageSnapshot
  SurveyParticipant: SurveyParticipant
  SurveyParticipantAttribute: SurveyParticipantAttribute
  SurveyParticipantAttributeLanguage: SurveyParticipantAttributeLanguage
  SurveyParticipantAttributeLanguageSnapshot: SurveyParticipantAttributeLanguageSnapshot
  SurveyParticipantAttributeSnapshot: SurveyParticipantAttributeSnapshot
  SurveyPublication: SurveyPublication
  Task: Task
  TaskExecution: TaskExecution
  UserAccessToken: UserAccessToken
}

type MustBeNever<T extends never> = T

/** Fails to compile, naming the model and field, when a migrated model has an `any` field. */
export type NoAnyFields = MustBeNever<
  { [M in keyof Migrated]: AnyKeys<Migrated[M]> }[keyof Migrated]
>
