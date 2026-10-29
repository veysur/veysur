import { Repo, ServerErrorBadRequest, RepoRelationBuilder as relb, RepoIndexBuilder as repib } from '@datacapy/server'
import { Survey } from 'veysur-common'

import { RepoSurveyElement, RepoSurveySection } from 'model'

export class RepoSurvey extends Repo<Survey> {
  constructor() {
    super({
      name: 'survey',
      dataSource: 'project', // Use project-specific dynamic datasource
      autoIndex: false,
      relations: {
        elements: relb.hasMany('surveyElement').key('surveyId'),
        sections: relb.hasMany('surveySection').key('surveyId'),
        responses: relb.hasMany('surveyResponse').key('surveyId'),
        createdBy: relb.belongsToOne('user').key('createdById').fields({
          _id: 1,
          role: 1,
          nameFirst: 1,
          nameLast: 1,
        }),
      },
      indexes: {
        createdAt: repib.desc('createdAt').timestamp(),
        updatedAt: repib.desc('updatedAt').timestamp(),
        createdById: repib
          .asc('createdById')
          .desc('createdAt')
          .timestamp('createdAt'),
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
