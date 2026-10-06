import {
  Patch,
  ProjectEmailTemplateEntry,
  ProjectSettingsData,
  ProjectSettingsRawImport,
  SettingsSchemaValidator,
} from 'veysur-common'

import { AclConditions, AclContext } from 'model/entity/AclContext'

export const PROJECT_IMPORT_PARTS = [
  'timezone',
  'settings',
  'templates',
] as const
export type ProjectImportPart = (typeof PROJECT_IMPORT_PARTS)[number]

export type ProjectImportPartOutcome = {
  part: ProjectImportPart
  status: 'applied' | 'failed'
  message?: string
}

/** The services the handler talks to, resolved lazily so an extension's overrides apply. */
export interface ProjectServiceLike {
  getById(
    projectId: string,
  ): Promise<{ timezone: string; ownerId: string } | null>
  updateTimezone(args: {
    projectId: string
    timezone: string
    aclContext: AclContext
  }): Promise<unknown>
}

export interface SettingSurveyServiceLike {
  getOne(args: {
    projectId: string
    aclConditions: AclConditions
  }): Promise<unknown>
  patch(args: { projectId: string; patches: Patch[] }): Promise<unknown>
}

export interface EmailTemplateServiceLike {
  getProjectAll(args: { projectId: string }): Promise<{
    projectTemplates: Array<{
      type: string
      lang: string
      subject?: string | null
      body?: string | null
    }>
  }>
  patchProject(args: { projectId: string; patches: Patch[] }): Promise<unknown>
}

export interface ProjectEntityHandlerDeps {
  getProjectService: () => ProjectServiceLike
  getSettingSurveyService: () => SettingSurveyServiceLike
  getEmailTemplateService: () => EmailTemplateServiceLike
  getSettingsSchema: () => SettingsSchemaValidator
}

export type ProjectExportBundle = {
  timezone: string
  settings: ProjectSettingsData
  templates: ProjectEmailTemplateEntry[]
}

export type ProjectParsedBundle = {
  raw: ProjectSettingsRawImport
  cleanup: () => Promise<void>
}

/** What persistImport applies: only the parts the caller selected and the archive contained. */
export type ProjectImportPlan = {
  timezone: string | null
  settings: ProjectSettingsData | null
  templates: ProjectEmailTemplateEntry[]
}
