import { Service, ServerErrorNotFound } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import {
  SurveyParticipant,
  Survey,
  SettingSurvey,
  StringRandom,
} from 'veysur-common'

import { RepoSurveyParticipant, RepoSurvey, RepoSettingSurvey } from 'model'
import { AclContext } from 'model/entity/AclContext'
import { ParticipantToken } from './ParticipantToken'
import { EmailVerifyToken } from './EmailVerifyToken'

export class ServiceSurveyParticipantGenerate extends Service {
  private static readonly BATCH_SIZE = 100
  private static readonly MAX_ATTEMPTS = 3
  private static readonly CANDIDATE_MULTIPLIER = 1.5

  constructor() {
    super({ name: 'surveyParticipantGenerate' })
  }

  /**
   * Generate test participants for a survey
   * Creates participants with sequential naming (Test User 1, Test User 2, etc.)
   */
  async generate({
    surveyId,
    projectId,
    count,
    aclContext,
  }: {
    surveyId: string
    projectId: string
    count: number
    aclContext: AclContext
  }): Promise<{ generatedCount: number }> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')

    this.validateCount(count)

    const defaultLanguage = await this.getDefaultLanguage({
      surveyId,
      context,
      repoSurvey,
      repoSettingSurvey,
    })

    let generatedCount = 0
    let remaining = count

    while (remaining > 0) {
      const currentBatchSize = Math.min(
        remaining,
        ServiceSurveyParticipantGenerate.BATCH_SIZE,
      )

      const uniqueEmails = await this.generateUniqueEmails({
        surveyId,
        context,
        count: currentBatchSize,
        repoSurveyParticipant,
      })

      await this.createParticipantBatch({
        surveyId,
        context,
        emails: uniqueEmails,
        defaultLanguage,
        startIndex: generatedCount,
        aclContext,
        repoSurveyParticipant,
        repoSurvey,
        repoSettingSurvey,
      })

      generatedCount += currentBatchSize
      remaining -= currentBatchSize
    }

    return { generatedCount }
  }

  /**
   * Validate the count parameter
   */
  private validateCount(count: number): void {
    if (count < 1 || count > 1000) {
      throw new Error('Count must be between 1 and 1000')
    }
  }

  /**
   * Get default language from survey and settings
   */
  private async getDefaultLanguage({
    surveyId,
    context,
    repoSurvey,
    repoSettingSurvey,
  }: {
    surveyId: string
    context: DataSourceContext
    repoSurvey: RepoSurvey
    repoSettingSurvey: RepoSettingSurvey
  }): Promise<string> {
    const survey = await repoSurvey.findOne({ _id: surveyId }, { context })
    if (!survey) {
      throw new ServerErrorNotFound('Survey not found')
    }

    const settingSurvey = await repoSettingSurvey.findOne({}, { context })
    const surveyInstance = new Survey(survey)
    const settingInstance = new SettingSurvey(settingSurvey)

    return surveyInstance.getLanguage(settingInstance).default
  }

  /**
   * Generate unique emails for a batch of participants
   */
  private async generateUniqueEmails({
    surveyId,
    context,
    count,
    repoSurveyParticipant,
  }: {
    surveyId: string
    context: DataSourceContext
    count: number
    repoSurveyParticipant: RepoSurveyParticipant
  }): Promise<string[]> {
    const uniqueEmails: string[] = []

    for (
      let attempt = 1;
      attempt <= ServiceSurveyParticipantGenerate.MAX_ATTEMPTS;
      attempt++
    ) {
      const candidateCount = Math.ceil(
        count * ServiceSurveyParticipantGenerate.CANDIDATE_MULTIPLIER,
      )
      const candidateEmails = this.generateCandidateEmails(candidateCount)

      const existingEmails = await this.getExistingEmails({
        surveyId,
        context,
        emails: candidateEmails,
        repoSurveyParticipant,
      })

      const availableEmails = candidateEmails.filter(
        (email) => !existingEmails.has(email) && !uniqueEmails.includes(email),
      )

      uniqueEmails.push(
        ...availableEmails.slice(0, count - uniqueEmails.length),
      )

      if (uniqueEmails.length >= count) {
        return uniqueEmails
      }

      if (attempt === ServiceSurveyParticipantGenerate.MAX_ATTEMPTS) {
        throw new Error(
          `Failed to generate ${count} unique emails after ${ServiceSurveyParticipantGenerate.MAX_ATTEMPTS} attempts`,
        )
      }
    }

    return uniqueEmails
  }

  /**
   * Generate candidate email addresses
   */
  private generateCandidateEmails(count: number): string[] {
    return Array.from({ length: count }, () => {
      const randomStr = StringRandom.genAlphaNumericLower(8)
      return `test.${randomStr}@example.com`
    })
  }

  /**
   * Get existing emails from database
   */
  private async getExistingEmails({
    surveyId,
    context,
    emails,
    repoSurveyParticipant,
  }: {
    surveyId: string
    context: DataSourceContext
    emails: string[]
    repoSurveyParticipant: RepoSurveyParticipant
  }): Promise<Set<string>> {
    const existingParticipants = await repoSurveyParticipant.find(
      {
        surveyId,
        email: { $in: emails },
      },
      { context },
    )

    return new Set(existingParticipants.map((p) => p.email))
  }

  /**
   * Create a batch of participants
   */
  private async createParticipantBatch({
    surveyId,
    context,
    emails,
    defaultLanguage,
    startIndex,
    aclContext,
    repoSurveyParticipant,
    repoSurvey,
    repoSettingSurvey,
  }: {
    surveyId: string
    context: DataSourceContext
    emails: string[]
    defaultLanguage: string
    startIndex: number
    aclContext: AclContext
    repoSurveyParticipant: RepoSurveyParticipant
    repoSurvey: RepoSurvey
    repoSettingSurvey: RepoSettingSurvey
  }): Promise<void> {
    // Generate all tokens for this batch at once
    const tokens = await ParticipantToken.generateUniqueBatch({
      surveyId,
      context,
      count: emails.length,
      repoSurveyParticipant,
      repoSurvey,
      repoSettingSurvey,
    })

    // Create all participants in the batch
    for (let i = 0; i < emails.length; i++) {
      const participant = {
        surveyId,
        nameFirst: 'Test',
        nameLast: `User ${startIndex + i + 1}`,
        email: emails[i],
        language: defaultLanguage,
        token: tokens[i],
        emailVerifyToken: EmailVerifyToken.generate(),
        createdById: aclContext.jwt._id,
      }

      await repoSurveyParticipant.create(new SurveyParticipant(participant), {
        context,
      })
    }
  }
}

export default ServiceSurveyParticipantGenerate
