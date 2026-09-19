import { ServerErrorNotFound } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import { StringRandom, Survey, SettingSurvey } from 'veysur-common'

import { RepoSurveyParticipant, RepoSurvey, RepoSettingSurvey } from 'model'

export interface GenerateUniqueParams {
  surveyId: string
  context: DataSourceContext
  excludeParticipantId?: string
  repoSurveyParticipant: RepoSurveyParticipant
  repoSurvey: RepoSurvey
  repoSettingSurvey: RepoSettingSurvey
}

export interface CheckUniquenessParams {
  token: string
  surveyId: string
  context: DataSourceContext
  excludeParticipantId?: string
  repoSurveyParticipant: RepoSurveyParticipant
}

export class ParticipantToken {
  private static readonly MAX_ATTEMPTS = 3
  private static readonly CANDIDATE_MULTIPLIER = 1.5

  /**
   * Generate a unique token for a participant in a survey
   * Retries up to 3 times if collisions occur
   */
  static async generateUnique({
    surveyId,
    context,
    excludeParticipantId,
    repoSurveyParticipant,
    repoSurvey,
    repoSettingSurvey,
  }: GenerateUniqueParams): Promise<string> {
    const tokens = await this.generateUniqueBatch({
      surveyId,
      context,
      count: 1,
      excludeParticipantId,
      repoSurveyParticipant,
      repoSurvey,
      repoSettingSurvey,
    })
    return tokens[0]
  }

  /**
   * Generate multiple unique tokens for participants in a survey
   * Uses batch checking to minimize database queries
   */
  static async generateUniqueBatch({
    surveyId,
    context,
    count,
    excludeParticipantId,
    repoSurveyParticipant,
    repoSurvey,
    repoSettingSurvey,
  }: GenerateUniqueParams & { count: number }): Promise<string[]> {
    const survey = await repoSurvey.findOne({ _id: surveyId }, { context })
    if (!survey) {
      throw new ServerErrorNotFound('Survey not found')
    }
    const settingSurvey = await repoSettingSurvey.findOne({}, { context })
    const { tokenLength } = new Survey(survey).getParticipant(
      new SettingSurvey(settingSurvey),
    )

    const uniqueTokens: string[] = []

    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      // Generate candidate tokens (150% of needed to reduce retries)
      const candidateCount = Math.ceil(count * this.CANDIDATE_MULTIPLIER)
      const candidateTokens = Array.from({ length: candidateCount }, () =>
        StringRandom.genAlphaNumericUpper(tokenLength),
      )

      // Check for existing tokens in database with single query
      const query: Record<string, unknown> = {
        surveyId,
        token: { $in: candidateTokens },
      }
      if (excludeParticipantId) {
        query._id = { $ne: excludeParticipantId }
      }
      const existingParticipants = await repoSurveyParticipant.find(query, {
        context,
      })
      const existingTokens = new Set(existingParticipants.map((p) => p.token))

      // Filter to only unique tokens
      const availableTokens = candidateTokens.filter(
        (token) => !existingTokens.has(token) && !uniqueTokens.includes(token),
      )

      uniqueTokens.push(
        ...availableTokens.slice(0, count - uniqueTokens.length),
      )

      if (uniqueTokens.length >= count) {
        return uniqueTokens.slice(0, count)
      }

      if (attempt === this.MAX_ATTEMPTS) {
        throw new Error(
          `Failed to generate ${count} unique tokens after ${this.MAX_ATTEMPTS} attempts`,
        )
      }
    }

    // TypeScript requires a return here, though we'll never reach it
    throw new Error('Failed to generate unique tokens')
  }

  /**
   * Check if a token is unique within a survey
   * Throws an error if the token already exists
   */
  static async checkUniqueness({
    token,
    surveyId,
    context,
    excludeParticipantId,
    repoSurveyParticipant,
  }: CheckUniquenessParams): Promise<void> {
    const query: Record<string, unknown> = { surveyId, token }
    if (excludeParticipantId) {
      query._id = { $ne: excludeParticipantId }
    }
    const existing = await repoSurveyParticipant.findOne(query, { context })
    if (existing) {
      throw new Error(`Token '${token}' already exists for this survey`)
    }
  }
}
