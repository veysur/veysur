import { DataSourceContext } from '@datacapy/om'
import { CompletionStatusFilter } from 'veysur-common'

import { buildDateRangeQuery } from 'common'
import type { RepoSurveyParticipant } from 'model'
import {
  findMatchingParticipants,
  buildResponseSearchQuery,
  buildCompletedFilter,
} from 'model/common'

export interface StatsQueryParams {
  surveyId: string
  snapshotId: string
  publicationId?: string
  completed?: CompletionStatusFilter
  startDate?: string
  endDate?: string
  dateField?: string
  timezone?: string
  search?: string
}

export interface StatsQueryResult {
  query: Record<string, unknown>
  skipValidation: boolean
}

export class StatsQueryBuilder {
  static async build(
    params: StatsQueryParams,
    repoParticipant: RepoSurveyParticipant,
    context?: DataSourceContext,
  ): Promise<StatsQueryResult> {
    const {
      surveyId,
      snapshotId,
      publicationId,
      completed,
      startDate,
      endDate,
      dateField,
      timezone,
      search,
    } = params

    const query: Record<string, unknown> = {
      surveyId,
      snapshotId,
    }

    if (publicationId) {
      if (publicationId === 'NO_PUBLICATION') {
        query.publicationId = null
      } else {
        query.publicationId = publicationId
      }
    }

    const orConditions: Record<string, unknown>[] = []

    // Filter by completion status
    if (completed === 'completed') {
      orConditions.push(buildCompletedFilter())
    } else if (completed === 'inProgress') {
      orConditions.push({ completed: false })
    } else if (completed === 'notStarted') {
      // A SurveyResponse document only exists once a participant has
      // started, so "not started" has no matching response - force an
      // empty result rather than querying for a state responses can't hold.
      query._id = { $exists: false }
    }

    // Apply date range filter using shared utility
    const dateQuery = buildDateRangeQuery({
      startDate,
      endDate,
      dateField,
      defaultField: 'createdAt',
      timezone,
    })
    Object.assign(query, dateQuery)

    // Search functionality - filter responses by participant data
    if (search) {

      // Find participants matching search criteria
      const participantIds = await findMatchingParticipants({
        search,
        surveyId,
        repoParticipant,
        context,
      })

      // Build response search query
      orConditions.push({
        $or: buildResponseSearchQuery(search, participantIds),
      })
    }

    if (orConditions.length === 1) {
      Object.assign(query, orConditions[0])
    } else if (orConditions.length > 1) {
      query.$and = orConditions
    }

    return {
      query,
      skipValidation: !!search,
    }
  }
}
