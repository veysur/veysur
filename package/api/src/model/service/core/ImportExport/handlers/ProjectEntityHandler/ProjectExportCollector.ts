import {
  PROJECT_EMAIL_TEMPLATE_TYPES,
  PROJECT_SETTINGS_EXCLUDED_KEYS,
  ProjectSettingsData,
} from 'veysur-common'

import { ServerErrorNotFound } from '@datacapy/server'

import { EntityExportContext } from '../../EntityHandlerInterface'
import { ProjectEntityHandlerDeps, ProjectExportBundle } from './types'

export class ProjectExportCollector {
  constructor(private readonly deps: ProjectEntityHandlerDeps) {}

  async collect(
    projectId: string,
    context: EntityExportContext,
  ): Promise<ProjectExportBundle> {
    if (projectId !== context.projectId) {
      throw new ServerErrorNotFound({ message: 'Project not found' })
    }

    const project = await this.deps.getProjectService().getById(projectId)
    if (!project) {
      throw new ServerErrorNotFound({ message: 'Project not found' })
    }

    const settingSurvey = await this.deps
      .getSettingSurveyService()
      .getOne({ projectId, aclConditions: context.aclConditions })
    const settings: ProjectSettingsData = JSON.parse(
      JSON.stringify(settingSurvey),
    )
    for (const key of PROJECT_SETTINGS_EXCLUDED_KEYS) delete settings[key]

    const { projectTemplates } = await this.deps
      .getEmailTemplateService()
      .getProjectAll({ projectId })
    const templates = projectTemplates
      .filter(
        (template) =>
          (PROJECT_EMAIL_TEMPLATE_TYPES as readonly string[]).includes(
            template.type,
          ) &&
          (template.subject || template.body),
      )
      .map((template) => ({
        type: template.type,
        lang: template.lang,
        subject: template.subject ?? null,
        body: template.body ?? null,
      }))

    return { timezone: project.timezone, settings, templates }
  }
}
