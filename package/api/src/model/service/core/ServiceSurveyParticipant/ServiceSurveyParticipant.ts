import { PropsOf } from 'mzen-schema'
import {
  Service,
  ServerErrorNotFound,
  ServerErrorBadRequest,
} from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import {
  SurveyParticipant,
  CompletionStatus,
  COMPLETION_STATUSES,
} from 'veysur-common'

import { parsePaginationParams, buildMultiFieldSearchQuery } from 'common'
import {
  RepoSurveyParticipant,
  RepoSurveyResponse,
  RepoSurvey,
  RepoSettingSurvey,
  RepoEmailSuppression,
  RepoEmail,
} from 'model'
import { findLiveSuppression, HARD_SUPPRESSION_REASONS } from 'model/common'
import { AclConditions, AclContext } from 'model/entity/AclContext'
import { ParticipantToken } from './ParticipantToken'
import { EmailVerifyToken } from './EmailVerifyToken'

type SurveyParticipantInput = Partial<PropsOf<SurveyParticipant>>

export class ServiceSurveyParticipant extends Service {
  constructor() {
    super({ name: 'surveyParticipant' })
  }

  /**
   * Create a new participant
   * Generates a token if not provided, validates uniqueness if provided
   */
  async create({
    participant,
    surveyId,
    projectId,
    aclContext,
  }: {
    participant: SurveyParticipantInput
    surveyId: string
    projectId: string
    aclContext: AclContext
  }): Promise<SurveyParticipantInput> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')

    participant.surveyId = surveyId
    participant.createdById = aclContext.jwt._id
    delete participant.emailStatus

    if (participant.email) {
      await this.checkEmailNotInUse({
        email: participant.email,
        surveyId,
        context,
        repoSurveyParticipant,
      })
    }

    if (!participant.token) {
      participant.token = await ParticipantToken.generateUnique({
        surveyId,
        context,
        repoSurveyParticipant,
        repoSurvey,
        repoSettingSurvey,
      })
    } else {
      await ParticipantToken.checkUniqueness({
        token: participant.token,
        surveyId,
        context,
        repoSurveyParticipant,
      })
    }

    participant.emailVerifyToken = EmailVerifyToken.generate()

    await repoSurveyParticipant.create(new SurveyParticipant(participant), {
      context,
    })

    return participant
  }

  /**
   * Get a single participant by ID
   */
  async getOne({
    participantId,
    surveyId,
    projectId,
    aclConditions: _aclConditions,
  }: {
    participantId: string
    surveyId: string
    projectId: string
    aclConditions: AclConditions
  }): Promise<
    Omit<SurveyParticipant, 'emailVerifyToken' | 'completionStatus'>
  > {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    const participant = await repoSurveyParticipant.findOne(
      {
        _id: participantId,
        surveyId,
      },
      { context },
    )
    if (!participant) {
      throw new ServerErrorNotFound('Survey participant not found')
    }
    const { emailVerifyToken: _emailVerifyToken, ...rest } = participant
    return rest
  }

  /**
   * Get the requesting participant's own profile and attribute values.
   * Used by the survey-taking client to evaluate display conditions that
   * reference participant data (system fields and custom attributes,
   * including internal ones such as token - internal only means "not shown
   * on the public registration form", not "unusable in conditions").
   */
  async getMe({
    aclContext,
  }: {
    aclContext: AclContext
  }): Promise<Pick<
    SurveyParticipant,
    'nameFirst' | 'nameLast' | 'email' | 'language' | 'token' | 'attributes'
  > | null> {
    const { surveyId, projectId, participantId } = aclContext
    if (!participantId) {
      return null
    }

    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    const participant = await repoSurveyParticipant.findOne(
      { _id: participantId, surveyId },
      { context },
    )
    if (!participant) {
      throw new ServerErrorNotFound('Survey participant not found')
    }

    return {
      nameFirst: participant.nameFirst,
      nameLast: participant.nameLast,
      email: participant.email,
      language: participant.language,
      token: participant.token,
      attributes: participant.attributes,
    }
  }

  /**
   * Get all participants for a survey with pagination and search
   */
  async getAll({
    surveyId,
    projectId,
    page,
    perPage,
    search,
    completionStatus,
  }: {
    surveyId: string
    projectId: string
    page: number
    perPage: number
    search?: string
    completionStatus?: CompletionStatus
  }): Promise<{
    participants: Omit<
      SurveyParticipant,
      'emailVerifyToken' | 'completionStatus'
    >[]
    participantCount: number
  }> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoSurveyResponse =
      this.getRepo<RepoSurveyResponse>('surveyResponse')

    const query: Record<string, unknown> = { surveyId }

    const pagination = parsePaginationParams(page, perPage)
    page = pagination.page
    perPage = pagination.perPage

    if (search) {
      Object.assign(
        query,
        buildMultiFieldSearchQuery(search, [
          'nameFirst',
          'nameLast',
          'email',
          'token',
        ]),
      )
    }

    if (completionStatus !== undefined) {
      if (!COMPLETION_STATUSES.includes(completionStatus)) {
        throw new ServerErrorBadRequest([
          { message: `Invalid completionStatus: ${completionStatus}` },
        ])
      }

      if (completionStatus === 'notStarted') {
        const respondedParticipantIds =
          await this.findParticipantIdsForResponses(
            repoSurveyResponse,
            context,
            { surveyId },
          )
        query._id = { $nin: respondedParticipantIds }
      } else {
        const matchingParticipantIds =
          await this.findParticipantIdsForResponses(
            repoSurveyResponse,
            context,
            {
              surveyId,
              completed: completionStatus === 'completed',
            },
          )

        if (matchingParticipantIds.length === 0) {
          return { participants: [], participantCount: 0 }
        }

        query._id = { $in: matchingParticipantIds }
      }
    }

    const [participants, participantCount] = await Promise.all([
      repoSurveyParticipant.find(query, {
        context,
        limit: perPage,
        sort: { createdAt: -1 },
        skip: (page - 1) * perPage,
        populate: {
          createdBy: true,
          surveyResponse: true,
        },
        skipValidation: !!search,
      }),
      repoSurveyParticipant.count(query, {
        context,
        skipValidation: !!search,
      }),
    ])

    const strippedParticipants = participants.map(
      ({ emailVerifyToken: _emailVerifyToken, ...rest }) => rest,
    )

    return { participants: strippedParticipants, participantCount }
  }

  private async checkEmailNotInUse({
    email,
    surveyId,
    context,
    repoSurveyParticipant,
    excludeParticipantId,
  }: {
    email: string
    surveyId: string
    context: DataSourceContext
    repoSurveyParticipant: RepoSurveyParticipant
    excludeParticipantId?: string
  }): Promise<void> {
    const query: Record<string, unknown> = { surveyId, email }
    if (excludeParticipantId) {
      query._id = { $ne: excludeParticipantId }
    }
    const existingByEmail = await repoSurveyParticipant.findOne(query, {
      context,
    })
    if (existingByEmail) {
      throw new ServerErrorBadRequest(
        `A participant with email "${email}" already exists for this survey`,
      )
    }
  }

  private async findParticipantIdsForResponses(
    repoSurveyResponse: RepoSurveyResponse,
    context: DataSourceContext,
    filter: Record<string, unknown>,
  ): Promise<string[]> {
    const responses = await repoSurveyResponse.find(filter, {
      context,
      fields: { participantId: 1 },
    })
    return responses.map((response) => response.participantId)
  }

  /**
   * Update an existing participant
   * Re-generates or validates token if changed
   */
  async update({
    participantId,
    surveyId,
    projectId,
    participant,
  }: {
    participantId: string
    surveyId: string
    projectId: string
    participant: SurveyParticipantInput
  }): Promise<boolean> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')

    delete participant._id
    delete participant.surveyId
    delete participant.createdAt
    delete participant.emailVerifyToken
    delete participant.emailStatus
    participant.updatedAt = new Date()

    const touchesSuppressionFields =
      participant.email !== undefined ||
      participant.bounceType !== undefined ||
      participant.complaintAt !== undefined

    const existing = touchesSuppressionFields
      ? await repoSurveyParticipant.findOne(
          { _id: participantId, surveyId },
          { context },
        )
      : null

    if (
      participant.email !== undefined &&
      existing &&
      existing.email !== participant.email
    ) {
      if (participant.email) {
        await this.checkEmailNotInUse({
          email: participant.email,
          surveyId,
          context,
          repoSurveyParticipant,
          excludeParticipantId: participantId,
        })
      }
      participant.emailStatus = 'pending'
      participant.emailVerifyToken = EmailVerifyToken.generate()
    }

    if (touchesSuppressionFields) {
      const effectiveEmail = participant.email ?? existing?.email
      if (effectiveEmail) {
        const repoEmailSuppression =
          this.getRepo<RepoEmailSuppression>('emailSuppression')
        const suppressed = await findLiveSuppression(
          repoEmailSuppression,
          effectiveEmail,
        )
        if (
          suppressed &&
          (HARD_SUPPRESSION_REASONS as readonly string[]).includes(
            suppressed.reason,
          )
        ) {
          participant.emailStatus = 'invalid'
          participant.bounceType =
            suppressed.reason === 'hardBounce'
              ? 'hardBounce'
              : (participant.bounceType ?? null)
          participant.complaintAt =
            suppressed.reason === 'complaint'
              ? new Date()
              : (participant.complaintAt ?? null)
        }
      }
    }

    if (participant.token === '' || participant.token === null) {
      participant.token = await ParticipantToken.generateUnique({
        surveyId,
        context,
        excludeParticipantId: participantId,
        repoSurveyParticipant,
        repoSurvey,
        repoSettingSurvey,
      })
    } else if (participant.token) {
      await ParticipantToken.checkUniqueness({
        token: participant.token,
        surveyId,
        context,
        excludeParticipantId: participantId,
        repoSurveyParticipant,
      })
    }

    await repoSurveyParticipant.updateOne(
      {
        _id: participantId,
        surveyId,
      },
      { $set: participant },
      { context },
    )

    return true
  }

  /**
   * Delete one or more participants
   * Supports comma-separated IDs for bulk delete
   */
  async delete({
    participantId,
    surveyId,
    projectId,
    aclConditions: _aclConditions,
  }: {
    participantId: string
    surveyId: string
    projectId: string
    aclConditions: AclConditions
  }): Promise<{ deletedCount: number }> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    // Support comma-separated IDs for bulk delete
    const ids = participantId.includes(',')
      ? participantId.split(',').map((id: string) => id.trim())
      : [participantId]

    if (ids.length === 1) {
      await repoSurveyParticipant.deleteOne(
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

    const toDelete = await repoSurveyParticipant.find(query, { context })
    const deletedCount = toDelete.length
    await repoSurveyParticipant.deleteMany(query, { context })
    return { deletedCount }
  }

  /**
   * Reset invite status (inviteSentAt + inviteQueuedAt) for one or more participants
   * Supports comma-separated IDs for bulk reset
   * Does not affect bounce/complaint tracking fields
   */
  async resetInviteStatus({
    participantId,
    surveyId,
    projectId,
    aclConditions,
  }: {
    participantId: string
    surveyId: string
    projectId: string
    aclConditions: AclConditions
  }): Promise<{ updatedCount: number }> {
    return this.resetEmailStatusField({
      participantId,
      surveyId,
      projectId,
      aclConditions,
      sentField: 'inviteSentAt',
      queuedField: 'inviteQueuedAt',
      emailType: 'invite',
    })
  }

  /**
   * Reset reminder status (reminderSentAt + reminderQueuedAt) for one or more participants
   * Supports comma-separated IDs for bulk reset
   * Does not affect bounce/complaint tracking fields
   */
  async resetReminderStatus({
    participantId,
    surveyId,
    projectId,
    aclConditions,
  }: {
    participantId: string
    surveyId: string
    projectId: string
    aclConditions: AclConditions
  }): Promise<{ updatedCount: number }> {
    return this.resetEmailStatusField({
      participantId,
      surveyId,
      projectId,
      aclConditions,
      sentField: 'reminderSentAt',
      queuedField: 'reminderQueuedAt',
      emailType: 'reminder',
    })
  }

  private async resetEmailStatusField({
    participantId,
    surveyId,
    projectId,
    aclConditions: _aclConditions,
    sentField,
    queuedField,
    emailType,
  }: {
    participantId: string
    surveyId: string
    projectId: string
    aclConditions: AclConditions
    sentField: 'inviteSentAt' | 'reminderSentAt'
    queuedField: 'inviteQueuedAt' | 'reminderQueuedAt'
    emailType: 'invite' | 'reminder'
  }): Promise<{ updatedCount: number }> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoEmail = this.getRepo<RepoEmail>('email')

    // Support comma-separated IDs for bulk reset
    const ids = participantId.includes(',')
      ? participantId.split(',').map((id: string) => id.trim())
      : [participantId]

    const query = {
      _id: { $in: ids },
      surveyId,
    }

    // De-queue first: a participant with a still-pending RepoEmail row would otherwise
    // get that row dispatched later by processQueue AND a fresh one enqueued next time
    // send-invites/send-reminders runs - a duplicate send. See docs/mail-queue-pacing.md.
    await repoEmail.deleteMany({
      'data.participantId': { $in: ids },
      type: emailType,
      status: 'pending',
    })

    // Both fields are reset together - a participant who was queued but never actually
    // dispatched (e.g. their pending RepoEmail row was deleted/errored out) must also
    // clear the "already queued" flag, or they stay permanently excluded from future
    // send-invites/send-reminders "who's due" queries. See docs/mail-queue-pacing.md.
    const result = await repoSurveyParticipant.updateMany(
      query,
      {
        $set: {
          [sentField]: null,
          [queuedField]: null,
          updatedAt: new Date(),
        },
      },
      { context },
    )

    return { updatedCount: result.count }
  }
}

export default ServiceSurveyParticipant
