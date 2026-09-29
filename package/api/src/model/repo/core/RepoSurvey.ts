import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from '@datacapy/server'
import { Survey } from 'veysur-common'

import { RepoSurveyElement, RepoSurveySection } from 'model'

export class RepoSurvey extends Repo<Survey> {
  constructor() {
    super({
      name: 'survey',
      dataSource: 'project', // Use project-specific dynamic datasource
      autoIndex: false,
      relations: {
        elements: {
          alias: 'elements',
          type: 'hasMany',
          repo: 'surveyElement',
          key: 'surveyId',
        },
        sections: {
          alias: 'sections',
          type: 'hasMany',
          repo: 'surveySection',
          key: 'surveyId',
        },
        responses: {
          alias: 'responses',
          type: 'hasMany',
          repo: 'surveyResponse',
          key: 'surveyId',
        },
        createdBy: {
          alias: 'createdBy',
          type: 'belongsToOne',
          repo: 'user',
          key: 'createdById',
          fields: {
            _id: 1,
            role: 1,
            nameFirst: 1,
            nameLast: 1,
          },
        },
      },
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        updatedAt: {
          spec: { updatedAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        createdById: {
          spec: { createdById: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }

  async create(surveyData, options?) {
    this.initSchema()
    const { isValid, errors } = await this.schema.validatePaths(surveyData)
    if (!isValid) {
      throw new ServerErrorBadRequest(errors)
    }

    await this.schema.applyFilters(surveyData)
    const survey = new Survey(surveyData)

    if (survey.sections && survey.sections.length) {
      const repoSection = this.getRepo<RepoSurveySection>('surveySection')
      const createSectionsPromises = survey.sections.map(async (section) => {
        const { isValid, errors } =
          await repoSection.schema.validatePaths(section)
        if (!isValid) {
          throw new ServerErrorBadRequest({ group: errors })
        }
        const newSection = survey.sections.getById(section._id)
        await repoSection.schema.applyFilters(newSection)
        await repoSection.insertOne(newSection, options)
      })
      await Promise.all(createSectionsPromises)
    }

    if (survey.elements && survey.elements.length) {
      const repoElement = this.getRepo<RepoSurveyElement>('surveyElement')
      const createElementPromises = survey.elements.map(async (element) => {
        const { isValid, errors } =
          await repoElement.schema.validatePaths(element)
        if (!isValid) {
          throw new ServerErrorBadRequest({ question: errors })
        }
        const newElement = survey.elements.getById(element._id)
        await repoElement.schema.applyFilters(newElement)
        await repoElement.insertOne(newElement, options)
      })
      await Promise.all(createElementPromises)
    }

    await this.insertOne(survey, options)

    return survey
  }
}

export default RepoSurvey
