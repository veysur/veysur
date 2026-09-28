import {
  Survey,
  SurveySection,
  SurveyQuestion,
  SurveyContent,
  CONTENT_TYPES,
} from 'veysur-common'

import { contextForProject } from 'common'
import { RepoSurvey, RepoSurveyElement, RepoSurveySection } from 'model'
import { AclContext } from 'model/entity/AclContext'

import { entityStamp } from '../util/entityStamp'
import { MarkdownResolvedContext } from './types'

/**
 * Thin counterpart to VsstImportPersister for markdown v1 imports: only
 * constructs and persists Survey/SurveySection/SurveyQuestion/SurveyContent
 * inside one transaction — no file uploads, no SurveyLanguage records
 * (markdown v1's L10n fields live directly on the entities, not in the
 * separate SurveyLanguage side-collection — see survey-markdown-format.md
 * implementation plan Part 2), no participant attributes, no email templates.
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
    })

    return { entityId: survey._id }
  }
}
