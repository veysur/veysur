import { Service } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import { Patcher, Patch, SettingSurvey } from 'veysur-common'

import { RepoSettingSurvey } from 'model'
import { contextForProject } from 'common'

export class ServiceSettingSurvey extends Service {
  constructor() {
    super({
      name: 'settingSurvey',
    })
  }

  async initForProject(
    projectId: string,
    context: DataSourceContext,
  ): Promise<SettingSurvey> {
    const repo = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const existing = await repo.findOne({}, { context })
    if (existing) return existing
    const settingSurvey = new SettingSurvey()
    await repo.create(settingSurvey, { context })
    return settingSurvey
  }

  async getOne({ projectId, aclConditions: _aclConditions }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSettingSurvey>('settingSurvey')

    let settingSurvey = await repo.findOne({}, { context })
    if (!settingSurvey) {
      // Setting survey should be created when creating a project
      // - but we can reset settings by deleting the original record
      // - a new record will be created if its not found
      settingSurvey = new SettingSurvey()
      await repo.create(settingSurvey, { context })
    }
    return settingSurvey
  }

  async patch({ projectId, patches }) {
    const context = contextForProject(projectId)
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')

    const patcher = new Patcher()

    patcher.addHandler('settingSurvey', 'update', async (patch: Patch) => {
      const updateData = { ...patch.data }
      delete updateData._id
      delete updateData.createdAt
      delete updateData.updatedAt

      updateData.updatedAt = new Date()
      await repoSettingSurvey.updateOne(
        {},
        {
          $set: updateData,
        },
        { context },
      )
    })

    await patcher.applyAll(patches)

    await this.modelManager.services.surveyEmbedArtefact.refreshProject({
      projectId,
    })

    return true
  }

  /**
   * Remove stats for questions that no longer exist in the given survey
   * Called from ServiceSurvey after survey patches are applied
   */
  async cleanupOrphanedStats(surveyId: string, projectId: string) {
    const context = contextForProject(projectId)
    const repoSurvey = this.getRepo('survey')

    // Get the survey to find valid question codes
    const survey = await repoSurvey.findOne(
      { _id: surveyId },
      {
        context,
        populate: {
          elements: true,
        },
      },
    )

    if (!survey?.stats?.questions || !survey.elements.questions()) {
      return // No stats to clean up or no questions
    }

    // Get valid question codes from the survey
    const validQuestionCodes = new Set<string>()
    for (const question of survey.elements.questions()) {
      if (question.code) {
        validQuestionCodes.add(question.code)
      }
    }

    // Find orphaned question codes in stats
    const statsQuestionCodes = Object.keys(survey.stats.questions)
    const orphanedCodes = statsQuestionCodes.filter(
      (code) => !validQuestionCodes.has(code),
    )

    // If there are orphaned codes, remove them
    if (orphanedCodes.length > 0) {
      const updatedQuestions = { ...survey.stats.questions }
      for (const code of orphanedCodes) {
        delete updatedQuestions[code]
      }

      await repoSurvey.updateOne(
        { _id: surveyId },
        {
          $set: {
            'stats.questions': updatedQuestions,
            updatedAt: new Date(),
          },
        },
        { context },
      )
    }
  }
}

export default ServiceSettingSurvey
