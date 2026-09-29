import { buildMultiFieldSearchQuery } from 'common'
import { DataSourceContext, QuerySelection } from '@datacapy/om'
import { RepoSurveyParticipant } from 'model/repo/core/RepoSurveyParticipant'

/**
 * Builds participant search query and finds matching participant IDs.
 * Each whitespace-separated token in `search` must match nameFirst, nameLast,
 * or email, so a full-name search (e.g. "Jane Doe") matches even when the
 * tokens are split across separate fields.
 */
export async function findMatchingParticipants({
  search,
  surveyId,
  repoParticipant,
  context,
}: {
  search: string
  surveyId: string
  repoParticipant: RepoSurveyParticipant
  context?: DataSourceContext
}): Promise<string[]> {
  const searchQuery = buildMultiFieldSearchQuery(search, [
    'nameFirst',
    'nameLast',
    'email',
  ])

  // Find participants matching the search criteria
  const matchingParticipants = await repoParticipant.find(
    {
      surveyId,
      ...searchQuery,
    },
    {
      context,
      projection: { _id: 1 },
      skipValidation: true,
    },
  )

  return matchingParticipants.map((p) => p._id)
}

/**
 * Builds response search query conditions for filtering by response ID and participant
 */
export function buildResponseSearchQuery(
  escapedSearch: string,
  participantIds: string[],
): QuerySelection[] {
  const conditions: QuerySelection[] = [
    { _id: { $regex: escapedSearch, $options: 'i' } }, // Response ID
  ]

  if (participantIds.length > 0) {
    conditions.push({ participantId: { $in: participantIds } }) // Participant match
  }

  return conditions
}

/**
 * Builds the "is completed" filter condition. Checks `completed` (the
 * authoritative flag) OR a non-null legacy `completedAt`, since documents
 * written before the `completed` field existed never get it backfilled.
 */
export function buildCompletedFilter(): { $or: QuerySelection[] } {
  return {
    $or: [{ completed: true }, { completedAt: { $ne: null } }],
  }
}
