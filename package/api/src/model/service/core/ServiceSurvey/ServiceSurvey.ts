import {
  Service,
  ServerErrorBadRequest,
  ServerErrorNotFound,
} from 'mzen-server'
import { Patcher, Survey } from 'veysur-common'
import { escapeRegex, buildDateRangeQuery, contextForProject } from 'common'

import {
  RepoSurvey,
  RepoEmailTemplate,
  RepoSurveyLanguage,
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipant,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
  RepoSurveyPublication,
  RepoSurveyElement,
  RepoSurveySection,
  RepoSurveyResponse,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
  ServiceProject,
} from 'model'
import { SurveyTemplateLoader } from 'model/common'
import { MarkdownImportPersister } from '../ImportExport/handlers/SurveyEntityHandler/MarkdownImportPersister'
import { MarkdownImportResolver } from '../ImportExport/handlers/SurveyEntityHandler/MarkdownImportResolver'
import { parseMarkdownSurvey } from '../ImportExport/handlers/SurveyEntityHandler/MarkdownSurveyParser'
import { ServiceFileDeletion } from '../ServiceFile/ServiceFileDeletion'
import { ServiceSettingSurvey } from '../ServiceSettingSurvey'
import { ServiceSurveyLanguage } from '../ServiceSurveyLanguage'
import { registerPatchHandlers } from './registerPatchHandlers'

export class ServiceSurvey extends Service {
  constructor() {
    super({
      name: 'survey',
    })
  }

  listTemplates() {
    const loader = SurveyTemplateLoader.getInstance()
    return loader.list().map((template) => {
      const { elements } = parseMarkdownSurvey(loader.getMarkdown(template.id))
      return {
        ...template,
        questionCount: elements.filter((e) => e.kind !== 'content').length,
      }
    })
  }

  private async createFromTemplate({
    survey,
    templateId,
    projectId,
    aclContext,
  }) {
    const markdown = SurveyTemplateLoader.getInstance().getMarkdown(templateId)
    if (!markdown) {
      throw new ServerErrorBadRequest({
        message: `Unknown survey template '${templateId}'`,
      })
    }

    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurvey>('survey')

    const bundle = parseMarkdownSurvey(markdown)
    const surveyName: string = survey.name?.trim()
    if (surveyName) {
      bundle.survey.name = surveyName
      bundle.survey.title = {
        ...bundle.survey.title,
        [bundle.survey.language.default]: surveyName,
      }
    }

    const resolved = await new MarkdownImportResolver(repo).resolve(bundle, {
      projectId,
      aclContext,
    })
    if (!resolved.valid) {
      throw new ServerErrorBadRequest({
        message: `Survey template '${templateId}' failed validation`,
      })
    }
    const { entityId } = await new MarkdownImportPersister(repo).persist(
      resolved.data,
      { projectId, aclContext },
    )

    await this.modelManager.services.eventLog.log({
      projectId,
      action: 'survey.created',
      userId: aclContext.jwt._id,
      metadata: { surveyId: entityId, templateId },
    })

    return repo.findOne({ _id: entityId }, { context })
  }

  async create({ survey, projectId, aclContext, templateId = undefined }) {
    if (templateId) {
      return this.createFromTemplate({
        survey,
        templateId,
        projectId,
        aclContext,
      })
    }

    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurvey>('survey')

    survey.createdById = aclContext.jwt._id

    // Clear any L10n that may have been passed in the request body — L10n is
    // stored in SurveyLanguage, not embedded in the survey document.
    const surveyName: string = survey.name ?? ''
    delete survey.title

    // Derive the three seed sections from the shared Survey model so their
    // defaults (code sequences, `<h3>` group-name markup, welcome-first /
    // thank-you-last ordering) stay in one place and match sections created
    // later through the editor.
    const seed = new Survey({ _id: survey._id })
      .ensureWelcomeSection()
      .ensureThankYouSection()
      .addSection({})
      .applySortOrder()
    const welcomeSection = seed.sections.welcome()
    const thankYouSection = seed.sections.thankYou()
    const initialGroup = seed.sections.groups()[0]

    await repo.transaction(context, async (context) => {
      await repo.create(survey, { context })
      await this.patch({
        surveyId: survey._id,
        projectId,
        patches: [
          {
            type: 'section',
            action: 'create',
            data: {
              _id: welcomeSection._id,
              code: welcomeSection.code,
              kind: welcomeSection.kind,
            },
          },
          {
            type: 'section',
            action: 'create',
            data: {
              _id: initialGroup._id,
              code: initialGroup.code,
              kind: initialGroup.kind,
              name: { ...initialGroup.name },
            },
          },
          {
            type: 'section',
            action: 'create',
            data: {
              _id: thankYouSection._id,
              code: thankYouSection.code,
              kind: thankYouSection.kind,
            },
          },
          {
            type: 'survey',
            action: 'update',
            id: survey._id,
            data: {
              sectionIds: seed.sectionIds,
              title: { en: surveyName },
            },
          },
        ],
        aclContext,
        context,
      })
    })

    await this.modelManager.services.eventLog.log({
      projectId,
      action: 'survey.created',
      userId: aclContext.jwt._id,
      metadata: { surveyId: survey._id },
    })

    return survey
  }

  async getOne({
    surveyId,
    aclConditions: _aclConditions,
    projectId,
    lang,
    defaultLang,
  }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurvey>('survey')
    let survey = await repo.findOne(
      {
        _id: surveyId,
      },
      {
        context,
        populate: {
          elements: true,
          sections: true,
        },
      },
    )
    if (!survey) {
      throw new ServerErrorNotFound('Survey not found')
    }
    survey = survey.applySortOrder()

    const activeLang = lang || 'en'
    const fallbackLang = defaultLang || activeLang
    const serviceSurveyLanguage =
      this.getService<ServiceSurveyLanguage>('surveyLanguage')
    return serviceSurveyLanguage.getSurveyWithLanguages(
      survey,
      projectId,
      activeLang,
      fallbackLang,
    )
  }

  async getAll({
    projectId,
    page,
    perPage = 20,
    search,
    startDate,
    endDate,
    dateField,
  }) {
    const context = contextForProject(projectId)

    // Convert to numbers (query params come as strings)
    page = Number(page)
    perPage = Number(perPage)

    page = page < 1 ? 1 : page
    perPage = perPage > 100 ? 100 : perPage

    const offset = (page - 1) * perPage

    const repo = this.getRepo<RepoSurvey>('survey')

    const query: Record<string, unknown> = {}
    if (search) {
      const escapedSearch = escapeRegex(search)
      query.name = { $regex: escapedSearch, $options: 'i' }
    }

    let timezone: string | undefined
    if (startDate || endDate) {
      const project =
        await this.getService<ServiceProject>('project').getById(projectId)
      timezone = project?.timezone
    }

    const dateQuery = buildDateRangeQuery({
      startDate,
      endDate,
      dateField,
      defaultField: 'createdAt',
      timezone,
    })
    Object.assign(query, dateQuery)

    const surveyCount = await repo.count(query, { context })

    const surveys = await repo.find(query, {
      context,
      limit: perPage,
      sort: { createdAt: -1 },
      skip: offset,
      populate: {
        createdBy: true,
      },
    })

    return { surveys, surveyCount }
  }

  async patch({ surveyId, projectId, patches, aclContext, context }) {
    context = context ?? contextForProject(projectId)
    const repos = {
      repoSurvey: this.getRepo<RepoSurvey>('survey'),
      repoSurveyElement: this.getRepo<RepoSurveyElement>('surveyElement'),
      repoSurveySection: this.getRepo<RepoSurveySection>('surveySection'),
      repoSurveyEmailTemplate: this.getRepo<RepoEmailTemplate>('emailTemplate'),
    }
    const fileTracker = {
      filesAdded: new Set<string>(),
      filesRemoved: new Set<string>(),
    }
    const patcher = new Patcher()

    registerPatchHandlers(patcher, {
      surveyId,
      projectId,
      userId: aclContext.jwt._id,
      context,
      repos,
      fileTracker,
      getL10nService: () =>
        this.getService<ServiceSurveyLanguage>('surveyLanguage'),
    })

    await patcher.applyAll(patches)

    // Delete files that were net-removed (removed but not re-added in the same batch)
    const removedFileIds = new Set<string>()
    for (const fileId of fileTracker.filesRemoved) {
      if (!fileTracker.filesAdded.has(fileId)) {
        removedFileIds.add(fileId)
      }
    }

    if (removedFileIds.size > 0) {
      const serviceFileDeletion =
        this.getService<ServiceFileDeletion>('fileDeletion')
      for (const fileId of removedFileIds) {
        try {
          await serviceFileDeletion.delete({ fileId, projectId })
        } catch (error) {
          if (
            error.name !== 'ServerErrorNotFound' &&
            error.name !== 'ServerErrorBadRequest'
          ) {
            this.logger.warn(
              `Failed to delete file ${fileId} during survey patch cleanup: ${error.message}`,
            )
          }
        }
      }
    }

    // Opportunistic cleanup (1/10 chance) of orphaned question stats
    const hasStatsQuestionsPatch = patches.some(
      (patch) =>
        patch.type === 'survey' && patch.data?.stats?.questions !== undefined,
    )
    if (hasStatsQuestionsPatch && Math.random() < 0.1) {
      const serviceSettingSurvey =
        this.getService<ServiceSettingSurvey>('settingSurvey')
      try {
        await serviceSettingSurvey.cleanupOrphanedStats(surveyId, projectId)
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup orphaned stats for survey ${surveyId}: ${error.message}`,
        )
      }
    }

    return true
  }

  async delete({
    surveyId,
    projectId,
    aclConditions: _aclConditions,
    aclContext,
  }) {
    const context = contextForProject(projectId)

    const repoSurvey = this.getRepo<RepoSurvey>('survey')

    const survey = await repoSurvey.findOne(
      {
        _id: surveyId,
      },
      { context },
    )

    if (!survey) {
      throw new ServerErrorNotFound('Survey not found')
    }

    await repoSurvey.transaction(context, async (context) => {
      await this.getRepo<RepoSurveyParticipant>('surveyParticipant').deleteMany(
        { surveyId },
        { context },
      )
      await this.getRepo<RepoSurveyParticipantAttribute>(
        'surveyParticipantAttribute',
      ).deleteOne({ surveyId }, { context })
      await this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      ).deleteMany({ surveyId }, { context })
      await this.getRepo<RepoSurveyPublication>('surveyPublication').deleteMany(
        { surveyId },
        { context },
      )
      await this.getRepo<RepoSurveySnapshot>('surveySnapshot').deleteMany(
        { 'survey._id': surveyId },
        { context },
      )
      await this.getRepo<RepoSurveySnapshotPartial>(
        'surveySnapshotPartial',
      ).deleteMany({ surveyId }, { context })
      await this.getRepo<RepoSurveyElement>('surveyElement').deleteMany(
        { surveyId },
        { context },
      )
      await this.getRepo<RepoSurveySection>('surveySection').deleteMany(
        { surveyId },
        { context },
      )
      await this.getRepo<RepoSurveyResponse>('surveyResponse').deleteMany(
        { surveyId },
        { context },
      )
      await this.getRepo<RepoSurveyLanguage>('surveyLanguage').deleteMany(
        { surveyId },
        { context },
      )
      await this.getRepo<RepoSurveyLanguageSnapshot>(
        'surveyLanguageSnapshot',
      ).deleteMany({ surveyId }, { context })
      await repoSurvey.deleteOne({ _id: surveyId }, { context })
    })

    await this.modelManager.services.eventLog.log({
      projectId,
      action: 'survey.deleted',
      userId: aclContext.jwt._id,
      metadata: { surveyId },
    })

    const serviceFileDeletion =
      this.getService<ServiceFileDeletion>('fileDeletion')
    try {
      await serviceFileDeletion.bulkDeleteForSurvey({
        surveyId,
        projectId,
      })
    } catch (error) {
      this.logger.warn(
        `Failed to delete S3 files for survey ${surveyId}: ${error.message}`,
      )
    }
  }
}

export default ServiceSurvey
