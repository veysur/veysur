import { Service, ServerErrorNotFound } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import { SurveyResponse, anonymisedTimestamp } from 'veysur-common'

import { escapeRegex, buildDateRangeQuery, contextForProject } from 'common'
import {
  findMatchingParticipants,
  buildResponseSearchQuery,
  buildCompletedFilter,
} from 'model/common'
import {
  RepoSurveyResponse,
  RepoSurveyParticipant,
  RepoSurveySnapshot,
  ServiceProject,
} from 'model'

export class ServiceSurveyResponse extends Service {
  constructor() {
    super({
      name: 'surveyResponse',
    })
  }

  /**
   * True when the survey the given snapshot was taken from has the anonymous
   * access setting enabled — in which case no participant id or real timestamp
   * may be written to a response for that snapshot.
   */
  private async isSnapshotAnonymous(
    snapshotId: string,
    context: DataSourceContext,
  ): Promise<boolean> {
    if (!snapshotId) return false
    const snapshot = await this.getRepo<RepoSurveySnapshot>(
      'surveySnapshot',
    ).findOne({ snapshotId }, { context })
    return !!snapshot?.survey?.access?.anonymous
  }

  /**
   * Manually created (admin) responses never count toward any plan-level
   * response usage limit a deployment may enforce, regardless of
   * completion status — this method intentionally never calls a usage guard.
   */
  async create({
    response,
    surveyId,
    snapshotId,
    publicationId = null,
    projectId,
    aclContext,
  }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')

    response.surveyId = surveyId
    response.snapshotId = snapshotId
    response.publicationId = publicationId || null
    response.createdById = aclContext.jwt._id

    if (await this.isSnapshotAnonymous(snapshotId, context)) {
      // Applied to `response` itself so the DB row and the returned body agree.
      response.participantId = null
      response.sessionId = null
      response.ip = null
      response.referrerUrl = null
      response.createdAt = anonymisedTimestamp()
      response.updatedAt = anonymisedTimestamp()
      if (response.startedAt) {
        response.startedAt = anonymisedTimestamp()
      }
      if (response.completedAt || response.completed) {
        response.completedAt = anonymisedTimestamp()
      }
    }

    const surveyResponse = new SurveyResponse(response)
    await repo.insertOne(surveyResponse, { context })

    return response
  }

  async getOne({ responseId, surveyId, projectId }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')
    const response = await repo.findOne(
      {
        _id: responseId,
        surveyId,
      },
      {
        context,
        populate: {
          participant: true,
          publication: true,
          snapshot: true,
        },
      },
    )
    if (!response) {
      throw new ServerErrorNotFound('Survey response not found')
    }
    return response
  }

  async getAll({
    surveyId,
    snapshotId,
    publicationId,
    projectId,
    page = 1,
    perPage = 20,
    completed,
    startDate,
    endDate,
    dateField,
    search,
    merged,
  }) {
    const context = contextForProject(projectId)

    // Convert to numbers (query params come as strings)
    page = Number(page)
    perPage = Number(perPage)

    page = page < 1 ? 1 : page
    perPage = perPage > 100 ? 100 : perPage

    const offset = (page - 1) * perPage

    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')

    // Build query with optional filters
    const query: Record<string, unknown> = {
      surveyId,
    }

    if (snapshotId) {
      query.snapshotId = snapshotId
    }

    if (publicationId) {
      if (publicationId === 'NO_PUBLICATION') {
        query.publicationId = null
      } else {
        query.publicationId = publicationId
      }
    }

    const orConditions: Record<string, unknown>[] = []

    // Filter by completed status
    if (completed === 'completed') {
      orConditions.push(buildCompletedFilter())
    }

    // Filter by merged status
    if (merged === 'merged') {
      query['merge.fromSnapshotId'] = { $ne: null }
    } else if (merged === 'notMerged') {
      query.$nor = [{ 'merge.fromSnapshotId': { $ne: null } }]
    }

    // Apply date range filter using shared utility
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

    // Search functionality
    if (search) {
      const escapedSearch = escapeRegex(search)
      const repoParticipant =
        this.getRepo<RepoSurveyParticipant>('surveyParticipant')

      // Find participants matching search criteria
      const participantIds = await findMatchingParticipants({
        search,
        surveyId,
        repoParticipant,
        context,
      })

      // Build response search query
      orConditions.push({
        $or: buildResponseSearchQuery(escapedSearch, participantIds),
      })
    }

    if (orConditions.length === 1) {
      Object.assign(query, orConditions[0])
    } else if (orConditions.length > 1) {
      query.$and = orConditions
    }

    const responseCount = await repo.count(query, {
      context,
      skipValidation: !!search,
    })

    const response = await repo.find(query, {
      context,
      limit: perPage,
      sort: { createdAt: -1 },
      skip: offset,
      populate: {
        participant: true,
      },
      skipValidation: !!search,
    })

    return {
      response,
      responseCount,
    }
  }

  async update({ responseId, surveyId, projectId, response }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')
    const existing = await repo.findOne(
      { _id: responseId, surveyId },
      { context },
    )

    delete response._id
    delete response.surveyId
    delete response.snapshotId
    delete response.createdAt

    if (await this.isSnapshotAnonymous(existing?.snapshotId, context)) {
      // Keep the response unlinkable and timeless however it is edited.
      response.participantId = null
      response.sessionId = null
      response.ip = null
      response.referrerUrl = null
      response.updatedAt = anonymisedTimestamp()
      if ('startedAt' in response && response.startedAt) {
        response.startedAt = anonymisedTimestamp()
      }
      if (response.completedAt || response.completed) {
        response.completedAt = anonymisedTimestamp()
      }
    } else {
      response.updatedAt = new Date()
    }

    await repo.updateOne(
      {
        _id: responseId,
        surveyId,
      },
      { $set: response },
      { context },
    )

    return true
  }

  async delete({ responseId, surveyId, projectId }) {
    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')

    // Support comma-separated IDs for bulk delete
    const ids = responseId.includes(',')
      ? responseId.split(',').map((id: string) => id.trim())
      : [responseId]

    if (ids.length === 1) {
      await repo.deleteOne(
        {
          _id: ids[0],
          surveyId,
        },
        { context },
      )
      return { deletedCount: 1 }
    }

    const query = {
      _id: { $in: ids },
      surveyId,
    }

    const toDelete = await repo.find(query, { context })
    const deletedCount = toDelete.length
    await repo.deleteMany(query, { context })
    return { deletedCount }
  }

  async getForParticipant({ aclContext }) {
    const { surveyId, snapshotId, projectId, participantId, sessionId } =
      aclContext

    const context = contextForProject(projectId)
    const repo = this.getRepo<RepoSurveyResponse>('surveyResponse')

    const response = await repo.findOne(
      {
        surveyId,
        snapshotId,
        participantId,
        sessionId,
      },
      { context },
    )

    return (response && { response }) || null
  }
}

export default ServiceSurveyResponse
