import {
  Survey,
  SurveySection,
  SurveyQuestion,
  SurveyContent,
  CONTENT_TYPES,
  extractSurveyLanguageFromSurvey,
} from 'veysur-common'

import { contextForProject } from 'common'
import {
  RepoSurvey,
  RepoSurveyElement,
  RepoSurveyLanguage,
  RepoSurveySection,
} from 'model'
import { AclContext } from 'model/entity/AclContext'

import { entityStamp } from '../util/entityStamp'
import { MarkdownResolvedContext } from './types'

/**
 * Thin counterpart to VsstImportPersister for markdown v1 imports: persists
 * Survey/SurveySection/SurveyQuestion/SurveyContent plus one SurveyLanguage
 * record per language, inside one transaction — no file uploads, no
 * participant attributes, no email templates.
 *
 * The language records are required, not optional: publishing snapshots them,
 * and a snapshot with none has no language to serve, so an embedded survey
 * reports itself unavailable.
 */
export class MarkdownImportPersister {
  constructor(private repoSurvey: RepoSurvey) {}

  async persist(
    data: MarkdownResolvedContext,
    context: { projectId: string; aclContext: AclContext },
  ): Promise<{ entityId: string }> {
    const { projectId, aclContext } = context
    const userId = aclContext.jwt._id

    const dsContext = contextForProject(projectId)

    const repoSection =
      this.repoSurvey.getRepo<RepoSurveySection>('surveySection')
    const repoElement =
      this.repoSurvey.getRepo<RepoSurveyElement>('surveyElement')
    const repoLanguage =
      this.repoSurvey.getRepo<RepoSurveyLanguage>('surveyLanguage')

    let survey: Survey

    await this.repoSurvey.transaction(dsContext, async (dsContext) => {
      survey = new Survey({ ...data.survey, ...entityStamp(userId) })
      await this.repoSurvey.create(survey, { context: dsContext })

      for (const sectionData of data.sections) {
        const section = new SurveySection({
          ...sectionData,
          ...entityStamp(userId),
        } as ConstructorParameters<typeof SurveySection>[0])
        await repoSection.insertOne(section, { context: dsContext })
      }

      for (const elementData of data.elements) {
        const input = {
          ...elementData,
          ...entityStamp(userId),
        }
        const elementType = elementData.type
        const isContent =
          elementData.kind === 'content' ||
          (!!elementType &&
            (CONTENT_TYPES as readonly string[]).includes(elementType))
        const element = isContent
          ? new SurveyContent(
              input as ConstructorParameters<typeof SurveyContent>[0],
            )
          : new SurveyQuestion(
              input as ConstructorParameters<typeof SurveyQuestion>[0],
            )
        await repoElement.insertOne(element, { context: dsContext })
      }

      const populated = new Survey({
        ...data.survey,
        sections: data.sections,
        elements: data.elements,
      } as ConstructorParameters<typeof Survey>[0])
      const languageCodes = new Set<string>([
        survey.language.default,
        ...(survey.language.options ?? []),
      ])
      for (const languageCode of languageCodes) {
        await repoLanguage.insertOne(
          extractSurveyLanguageFromSurvey(populated, survey._id, languageCode),
          { context: dsContext },
        )
      }
    })

    return { entityId: survey._id }
  }
}
