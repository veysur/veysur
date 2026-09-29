import { Service, ServerErrorBadRequest } from 'mzen-server'
import { contextForProject } from 'common'

import { RepoSurvey } from 'model'
import { SurveyTemplateLoader } from 'model/common'
import { MarkdownImportPersister } from './ImportExport/handlers/SurveyEntityHandler/MarkdownImportPersister'
import { MarkdownImportResolver } from './ImportExport/handlers/SurveyEntityHandler/MarkdownImportResolver'
import { parseMarkdownSurvey } from './ImportExport/handlers/SurveyEntityHandler/MarkdownSurveyParser'

export class ServiceSurveyTemplate extends Service {
  constructor() {
    super({
      name: 'surveyTemplate',
    })
  }

  list() {
    return SurveyTemplateLoader.getInstance().list()
  }

  async createSurvey({ survey, templateId, projectId, aclContext }) {
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
}
