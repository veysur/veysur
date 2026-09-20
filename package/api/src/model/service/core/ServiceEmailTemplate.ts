import { Service } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import {
  Patcher,
  Patch,
  EmailTemplate,
  EmailTemplateCollection,
  EmailTemplateCollectionComposite,
} from 'veysur-common'

import { RepoEmailTemplate } from 'model'
import { SystemEmailTemplateLoader } from 'model/common/EmailTemplateLoader'
import { wrapEmailBody } from 'model/common/emailLayout'

export class ServiceEmailTemplate extends Service {
  constructor() {
    super({
      name: 'emailTemplate',
    })
  }

  private async _getProjectDefaultLang(): Promise<string> {
    // The Project model tracks no language setting (core has no RepoProject
    // at all, only a single static project) — 'en' is the only real default, matching the
    // fallback every caller of projectDefaultLang already uses.
    return 'en'
  }

  private _getRelevantSystemTemplates(
    projectDefaultLang: string,
    templates: EmailTemplate[],
  ) {
    const loader = SystemEmailTemplateLoader.getInstance()
    const languages = new Set([projectDefaultLang, 'en'])

    // Add any languages used in templates
    templates.forEach((t) => languages.add(t.lang))

    return Array.from(languages).flatMap((lang) =>
      loader.getTemplatesByLanguage(lang),
    )
  }

  async getOne({ projectId, surveyId, type, lang }) {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoEmailTemplate>('emailTemplate')

    let setting = await repo.findOne({ type, lang }, { context })
    if (!setting) {
      setting = new EmailTemplate({ surveyId, type, lang })
      await repo.create(setting, { context })
    }
    return setting
  }

  async getAll({
    projectId,
    surveyId,
    includeDefaults = false,
  }: {
    projectId: string
    surveyId?: string | null
    includeDefaults?: boolean
  }): Promise<{
    surveyTemplates: EmailTemplate[]
    projectTemplates: EmailTemplate[]
    systemTemplates: EmailTemplate[]
    projectDefaultLang: string
  }> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoEmailTemplate>('emailTemplate')
    const projectDefaultLang = await this._getProjectDefaultLang()

    // Fetch survey and project templates from database
    const [surveyTemplatesRaw, projectTemplatesRaw] = await Promise.all([
      repo.find({ surveyId }, { context }),
      repo.find({ surveyId: null }, { context }),
    ])

    // Filter out empty templates (templates without subject AND body)
    // Empty templates should fall back to lower tiers
    const surveyTemplates = surveyTemplatesRaw.filter(
      (t) => t.subject || t.body,
    )
    const projectTemplates = projectTemplatesRaw.filter(
      (t) => t.subject || t.body,
    )

    const systemTemplates = includeDefaults
      ? this._getRelevantSystemTemplates(projectDefaultLang, [
          ...projectTemplates,
          ...surveyTemplates,
        ])
      : []

    return {
      surveyTemplates,
      projectTemplates,
      systemTemplates,
      projectDefaultLang,
    }
  }

  async getProjectAll({ projectId }) {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoEmailTemplate>('emailTemplate')

    const projectDefaultLang = await this._getProjectDefaultLang()
    const projectTemplates = await repo.find({ surveyId: null }, { context })
    const systemTemplates = this._getRelevantSystemTemplates(
      projectDefaultLang,
      projectTemplates,
    )

    return {
      projectTemplates,
      systemTemplates,
      projectDefaultLang,
    }
  }

  async deleteOne({ projectId, surveyId, type, lang }) {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoEmailTemplate>('emailTemplate')
    await repo.deleteOne({ surveyId, type, lang }, { context })
    return true
  }

  private async _applyPatches({
    projectId,
    surveyId,
    patches,
    includeDeleteHandler = true,
  }: {
    projectId: string
    surveyId: string | null
    patches: Patch[]
    includeDeleteHandler?: boolean
  }) {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoEmailTemplate>('emailTemplate')

    const patcher = new Patcher()

    patcher.addHandler('emailTemplate', 'update', async (patch: Patch) => {
      const { type, lang, subject, body } = patch.data as {
        type: string
        lang: string
        subject: string | null
        body: string | null
      }

      const filter = {
        surveyId,
        type,
        lang,
      }

      // If both subject and body are null, delete the template (revert to default)
      if (subject === null && body === null) {
        await repo.deleteOne(filter, { context })
        return
      }

      const existing = await repo.findOne(filter, { context })

      if (existing) {
        const updateData = {
          subject,
          body,
          updatedAt: new Date(),
        }
        await repo.updateOne(filter, { $set: updateData }, { context })
      } else {
        const newTemplate = new EmailTemplate({
          surveyId,
          type,
          lang,
          subject,
          body,
        })
        await repo.create(newTemplate, { context })
      }
    })

    if (includeDeleteHandler) {
      patcher.addHandler('emailTemplate', 'delete', async (patch: Patch) => {
        const { type, lang } = patch.data
        await repo.deleteOne({ surveyId, type, lang }, { context })
      })
    }

    await patcher.applyAll(patches)

    return true
  }

  async patch({ projectId, surveyId, patches }) {
    return this._applyPatches({ projectId, surveyId, patches })
  }

  async patchProject({ projectId, patches }) {
    return this._applyPatches({
      projectId,
      surveyId: null,
      patches,
      includeDeleteHandler: false,
    })
  }

  async getSystemTemplates({ lang = 'en' }) {
    const loader = SystemEmailTemplateLoader.getInstance()
    return loader.getTemplatesByLanguage(lang)
  }

  async getSystemTemplate({ type, lang }) {
    const loader = SystemEmailTemplateLoader.getInstance()
    return loader.getTemplate(type, lang)
  }

  /**
   * Get a resolved email template with automatic fallback
   * Uses the composite pattern to resolve templates across survey -> project -> system levels
   *
   * @param projectId - The project ID
   * @param surveyId - The survey ID (optional, for survey-level templates)
   * @param type - The template type (e.g., 'invite', 'reminder')
   * @param lang - The language code (e.g., 'en', 'fr')
   * @returns The resolved EmailTemplate with automatic fallback, or null if not found
   */
  async getResolved({
    projectId,
    surveyId,
    type,
    lang,
  }: {
    projectId: string
    surveyId?: string | null
    type: string
    lang: string
  }): Promise<EmailTemplate | null> {
    const {
      surveyTemplates,
      projectTemplates,
      systemTemplates,
      projectDefaultLang,
    } = await this.getAll({
      projectId,
      surveyId,
      includeDefaults: true,
    })

    const composite = new EmailTemplateCollectionComposite({
      surveyTemplates: EmailTemplateCollection.fromArray(surveyTemplates),
      projectTemplates: EmailTemplateCollection.fromArray(projectTemplates),
      systemTemplates: EmailTemplateCollection.fromArray(systemTemplates),
      projectDefaultLang,
    })

    const resolved = composite.getTemplate({ type, lang })
    // Resolved system templates are shared cached instances from
    // SystemEmailTemplateLoader — clone rather than mutate so wrapping the body
    // here doesn't leak into other callers (e.g. getAll()) that expect fragments.
    return resolved
      ? new EmailTemplate({ ...resolved, body: wrapEmailBody(resolved.body) })
      : resolved
  }
}

export default ServiceEmailTemplate
