import { Service } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import { SurveyParticipant } from 'veysur-common'
import type { Response } from 'express'

import { RepoSurveyParticipant, RepoSurveyParticipantAttribute } from 'model'
import { streamCsv, generateCsvFilename, contextForProject } from 'common'

export class ServiceSurveyParticipantExport extends Service {
  private readonly HEADERS = [
    'First Name',
    'Last Name',
    'Email',
    'Email Status',
    'Invite Sent',
    'Reminder Sent',
    'Language',
    'Token',
    'Created',
  ]

  constructor() {
    super({ name: 'surveyParticipantExport' })
  }

  private async getCustomAttributeNames(
    surveyId: string,
    context: DataSourceContext,
  ): Promise<string[]> {
    const repoSurveyParticipantAttribute =
      this.getRepo<RepoSurveyParticipantAttribute>('surveyParticipantAttribute')

    const doc = await repoSurveyParticipantAttribute.findOne(
      { surveyId },
      { context },
    )

    return (doc?.attributes ?? []).map((a) => a.name)
  }

  /**
   * Export participants to CSV with streaming
   * Supports exporting all participants or a subset by IDs
   */
  async export({
    surveyId,
    projectId,
    ids,
    response,
  }: {
    surveyId: string
    projectId: string
    ids?: string
    response: Response
  }): Promise<void> {
    const context = contextForProject(projectId)
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    const idArray = ids
      ? ids.split(',').map((id: string) => id.trim())
      : undefined

    const customAttributeNames = await this.getCustomAttributeNames(
      surveyId,
      context,
    )

    const batchFetcher = async (skip: number, limit: number) => {
      const query: Record<string, unknown> = { surveyId }

      if (idArray && idArray.length > 0) {
        query._id = { $in: idArray }
      }

      return await repoSurveyParticipant.find(query, {
        context,
        limit,
        skip,
        sort: { createdAt: -1 },
      })
    }

    const rowMapper = (participant: SurveyParticipant) => [
      participant.nameFirst || '',
      participant.nameLast || '',
      participant.email || '',
      participant.emailStatus || '',
      participant.inviteSentAt
        ? new Date(participant.inviteSentAt).toISOString()
        : 'No',
      participant.reminderSentAt
        ? new Date(participant.reminderSentAt).toISOString()
        : 'No',
      participant.language || '',
      participant.token || '',
      participant.createdAt
        ? new Date(participant.createdAt).toISOString()
        : '',
      ...customAttributeNames.map(
        (name) => participant.attributes?.[name] ?? '',
      ),
    ]

    const headers = [...this.HEADERS, ...customAttributeNames]
    const filename = generateCsvFilename('participants', surveyId)

    await streamCsv(response, filename, headers, batchFetcher, rowMapper)
  }
}

export default ServiceSurveyParticipantExport
