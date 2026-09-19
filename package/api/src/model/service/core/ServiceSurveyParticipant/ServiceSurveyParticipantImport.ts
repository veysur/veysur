import { PropsOf } from 'mzen-schema'
import { Service, ServerErrorNotFound } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import {
  SurveyParticipant,
  Survey,
  SettingSurvey,
  isValidCustomAttributeName,
  SCHEMA_LENGTH_MAX_PARTICIPANT_ATTRIBUTE_VALUE,
} from 'veysur-common'
import Papa from 'papaparse'

import {
  RepoSurveyParticipant,
  RepoSurvey,
  RepoSettingSurvey,
  RepoSurveyParticipantAttribute,
} from 'model'
import { AclContext } from 'model/entity/AclContext'
import { ParticipantToken } from './ParticipantToken'
import { EmailVerifyToken } from './EmailVerifyToken'

/**
 * Response-like object this service writes an SSE progress stream to.
 * Framework-agnostic (mzen-server abstracts the underlying HTTP response),
 * so only the subset of the Express Response API actually used is declared.
 */
interface StreamableResponse {
  setHeader(name: string, value: string): void
  write(chunk: string): boolean
  end(): void
  flushHeaders(): void
}

type ProgressMessage =
  | {
      type: 'progress'
      imported: number
      errors: number
      batchErrors?: { row: number; message: string }[]
    }
  | { type: 'error'; row?: number; message: string }
  | { type: 'complete'; imported: number; errors: number }

/**
 * A CSV row after header normalization, mutated in place as it moves through
 * validation/context-setting/token-resolution before being persisted. Field
 * values start as raw CSV strings and get reassigned to parsed types (e.g.
 * `inviteSentAt` string -> Date | null), so values are `unknown` here —
 * genuinely dynamic import data narrowed at each read/write site.
 */
export interface ImportRow {
  _id?: string
  _rowNumber?: number
  surveyId?: string
  createdById?: string
  nameFirst?: string
  nameLast?: string
  email?: string
  inviteSentAt?: unknown
  reminderSentAt?: unknown
  language?: string
  token?: string
  attributes?: Record<string, string>
}

export class ServiceSurveyParticipantImport extends Service {
  private readonly COLUMN_MAPPINGS: Record<string, string> = {
    // Standard field names (camelCase)
    namefirst: 'nameFirst',
    namelast: 'nameLast',
    invitesent: 'inviteSentAt',
    inviteremindersent: 'reminderSentAt',
    remindersent: 'reminderSentAt',

    // Common variations with underscores
    name_first: 'nameFirst',
    first_name: 'nameFirst',
    name_last: 'nameLast',
    last_name: 'nameLast',
    invite_sent: 'inviteSentAt',
    invite_reminder_sent: 'reminderSentAt',
    reminder_sent: 'reminderSentAt',

    // Common variations without spaces
    firstname: 'nameFirst',
    lastname: 'nameLast',

    // Export format (with spaces) - matches export headers exactly
    'first name': 'nameFirst',
    'last name': 'nameLast',
    'invite sent': 'inviteSentAt',
    'invite reminder sent': 'reminderSentAt',
    'reminder sent': 'reminderSentAt',

    // Simple field names
    email: 'email',
    language: 'language',
    lang: 'language',
    token: 'token',
    _id: '_id',
    // Note: created is intentionally excluded - always use current timestamp
  }

  constructor() {
    super({ name: 'surveyParticipantImport' })
  }

  /**
   * Import participants from CSV with streaming and batch processing
   * Supports deduplication by email and token conflict resolution
   */
  async import({
    file,
    surveyId,
    projectId,
    batchSize,
    aclContext,
    response,
  }: {
    file: string
    surveyId: string
    projectId: string
    batchSize?: number
    aclContext: AclContext
    response: StreamableResponse
  }): Promise<void> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoSurveyParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')
    const repoSurvey = this.getRepo<RepoSurvey>('survey')
    const repoSettingSurvey = this.getRepo<RepoSettingSurvey>('settingSurvey')
    const repoSurveyParticipantAttribute =
      this.getRepo<RepoSurveyParticipantAttribute>('surveyParticipantAttribute')

    // Get survey and settings for defaults
    const survey = await repoSurvey.findOne({ _id: surveyId }, { context })
    if (!survey) {
      throw new ServerErrorNotFound('Survey not found')
    }
    const settingSurvey = await repoSettingSurvey.findOne({}, { context })
    const surveyInstance = new Survey(survey)
    const settingInstance = new SettingSurvey(settingSurvey)

    // Get default language from survey with settings fallback
    const defaultLanguage = surveyInstance.getLanguage(settingInstance).default

    // Get custom participant attribute names for this survey
    const customAttributeDoc = await repoSurveyParticipantAttribute.findOne(
      { surveyId },
      { context },
    )
    const customAttributeNames = new Set(
      (customAttributeDoc?.attributes ?? []).map((a) => a.name),
    )

    // Set up streaming response
    this.setupStreamingResponse(response)

    let totalImported = 0
    let totalErrors = 0
    let batch: ImportRow[] = []
    let rowNumber = 1 // Start at 1, header is row 0

    const processBatch = async () => {
      if (batch.length === 0) return

      const batchErrors: Array<{ row: number; message: string }> = []
      let batchImported = 0

      for (const participant of batch) {
        try {
          await this.processParticipant(
            participant,
            surveyId,
            context,
            defaultLanguage,
            aclContext.jwt._id,
            repoSurveyParticipant,
            repoSurvey,
            repoSettingSurvey,
          )
          batchImported++
        } catch (error) {
          const errorMessage = this.formatError(error)
          console.error(
            `Import error for row ${participant._rowNumber}:`,
            errorMessage,
          )
          console.error('Error details:', error)
          console.error('Participant data:', participant)
          batchErrors.push({
            row: participant._rowNumber,
            message: errorMessage || 'Unknown error',
          })
        }
      }

      totalImported += batchImported
      totalErrors += batchErrors.length

      // Send progress update
      this.sendProgress(response, {
        type: 'progress',
        imported: totalImported,
        errors: totalErrors,
        batchErrors:
          batchErrors.length > 0 ? batchErrors.slice(0, 10) : undefined,
      })

      batch = []
    }

    return new Promise((resolve, _reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        step: async (results: Papa.ParseStepResult<Record<string, string>>) => {
          if (results.errors.length > 0) {
            this.sendProgress(response, {
              type: 'error',
              row: rowNumber + 1,
              message: `CSV parsing error: ${results.errors[0].message}`,
            })
            totalErrors++
          } else {
            const normalized = this.normalizeHeaders(
              results.data,
              customAttributeNames,
            )
            batch.push({
              ...normalized,
              _rowNumber: rowNumber + 1,
            })

            if (batch.length >= batchSize) {
              await processBatch()
            }
          }
          rowNumber++
        },
        complete: async () => {
          try {
            // Process remaining batch
            await processBatch()

            // Send final result
            this.sendProgress(response, {
              type: 'complete',
              imported: totalImported,
              errors: totalErrors,
            })

            response.end()
            resolve(undefined)
          } catch (_error) {
            // Don't reject - response already sent or will be ended
            response.end()
            resolve(undefined)
          }
        },
        error: (error: Error) => {
          this.sendProgress(response, {
            type: 'error',
            message: `Failed to parse CSV: ${error.message}`,
          })
          response.end()
          resolve(undefined)
        },
      })
    })
  }

  /**
   * Setup streaming response headers
   */
  private setupStreamingResponse(response: StreamableResponse): void {
    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-cache')
    response.setHeader('Connection', 'keep-alive')
    response.flushHeaders()
  }

  /**
   * Send progress update to streaming response
   */
  private sendProgress(
    response: StreamableResponse,
    data: ProgressMessage,
  ): void {
    response.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  /**
   * Format error message from various error types
   */
  private formatError(error: unknown): string {
    // Extract validation errors from ServerErrorBadRequest
    if (
      error &&
      typeof error === 'object' &&
      error.constructor.name === 'ServerErrorBadRequest'
    ) {
      // Get all validation error fields (excluding standard Error properties)
      const validationErrors: string[] = []
      for (const [key, value] of Object.entries(error)) {
        if (
          key !== 'message' &&
          key !== 'stack' &&
          key !== 'name' &&
          Array.isArray(value)
        ) {
          validationErrors.push(...value.map((msg: string) => `${key}: ${msg}`))
        }
      }
      return validationErrors.length > 0
        ? validationErrors.join('; ')
        : (error as { message?: string }).message || 'Validation error'
    } else if (error instanceof Error) {
      return error.message
    } else if (typeof error === 'string') {
      return error
    } else {
      return JSON.stringify(error)
    }
  }

  /**
   * Validate participant has required fields
   */
  private validateParticipant(participant: ImportRow): {
    valid: boolean
    error?: string
  } {
    const hasNameFirst = participant.nameFirst && participant.nameFirst.trim()
    const hasNameLast = participant.nameLast && participant.nameLast.trim()
    const hasEmail = participant.email && participant.email.trim()

    if (!hasNameFirst && !hasNameLast && !hasEmail) {
      return {
        valid: false,
        error: 'At least one of nameFirst, nameLast, or email is required',
      }
    }

    return { valid: true }
  }

  /**
   * Parse and set participant context fields
   */
  private setParticipantContext(
    participant: ImportRow,
    surveyId: string,
    defaultLanguage: string,
    createdById: string,
  ): void {
    participant.surveyId = surveyId
    participant.createdById = createdById

    // Parse inviteSentAt - accept boolean-like or date values
    if (
      participant.inviteSentAt !== undefined &&
      participant.inviteSentAt !== ''
    ) {
      const value = String(participant.inviteSentAt).toLowerCase().trim()
      // Check if it's a boolean-like value
      if (['true', 'yes', '1', 'y'].includes(value)) {
        participant.inviteSentAt = new Date()
      } else if (['false', 'no', '0', 'n'].includes(value)) {
        participant.inviteSentAt = null
      } else {
        // Try to parse as date
        const parsedDate = new Date(participant.inviteSentAt as string)
        participant.inviteSentAt = isNaN(parsedDate.getTime())
          ? null
          : parsedDate
      }
    } else {
      participant.inviteSentAt = null
    }

    // Parse reminderSentAt - same logic
    if (
      participant.reminderSentAt !== undefined &&
      participant.reminderSentAt !== ''
    ) {
      const value = String(participant.reminderSentAt).toLowerCase().trim()
      if (['true', 'yes', '1', 'y'].includes(value)) {
        participant.reminderSentAt = new Date()
      } else if (['false', 'no', '0', 'n'].includes(value)) {
        participant.reminderSentAt = null
      } else {
        const parsedDate = new Date(participant.reminderSentAt as string)
        participant.reminderSentAt = isNaN(parsedDate.getTime())
          ? null
          : parsedDate
      }
    } else {
      participant.reminderSentAt = null
    }

    // Set default language if not provided
    if (!participant.language) {
      participant.language = defaultLanguage
    }
  }

  /**
   * Handle token for new participant - use from CSV if available and unique, otherwise generate
   */
  private async handleTokenForNewParticipant(
    participant: ImportRow,
    surveyId: string,
    context: DataSourceContext,
    repoSurveyParticipant: RepoSurveyParticipant,
    repoSurvey: RepoSurvey,
    repoSettingSurvey: RepoSettingSurvey,
  ): Promise<string> {
    if (!participant.token) {
      return await ParticipantToken.generateUnique({
        surveyId,
        context,
        repoSurveyParticipant,
        repoSurvey,
        repoSettingSurvey,
      })
    }

    // Token provided in CSV, check if it already exists
    const existingByToken = await repoSurveyParticipant.findOne(
      {
        surveyId,
        token: participant.token,
      },
      { context },
    )

    if (existingByToken) {
      // Token already exists, generate a new one
      return await ParticipantToken.generateUnique({
        surveyId,
        context,
        repoSurveyParticipant,
        repoSurvey,
        repoSettingSurvey,
      })
    }

    return participant.token
  }

  /**
   * Handle token update for existing participant
   */
  private async handleTokenForExistingParticipant(
    participant: ImportRow,
    existingParticipant: SurveyParticipant,
    surveyId: string,
    context: DataSourceContext,
    repoSurveyParticipant: RepoSurveyParticipant,
  ): Promise<string | undefined> {
    // Only update token if provided in CSV and different from existing
    if (!participant.token || participant.token === existingParticipant.token) {
      return undefined
    }

    // Check if new token is already used by another participant
    const tokenConflict = await repoSurveyParticipant.findOne(
      {
        surveyId,
        token: participant.token,
        _id: { $ne: existingParticipant._id },
      },
      { context },
    )

    if (tokenConflict) {
      // If there's a conflict, keep the existing token
      return undefined
    }

    return participant.token
  }

  /**
   * Update an existing participant
   */
  private async updateExistingParticipant(
    existingParticipant: SurveyParticipant,
    participant: ImportRow,
    surveyId: string,
    context: DataSourceContext,
    repoSurveyParticipant: RepoSurveyParticipant,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      nameFirst: participant.nameFirst,
      nameLast: participant.nameLast,
      inviteSentAt: participant.inviteSentAt,
      reminderSentAt: participant.reminderSentAt,
      language: participant.language,
      updatedAt: new Date(),
    }

    if (participant.attributes) {
      updateData.attributes = {
        ...existingParticipant.attributes,
        ...participant.attributes,
      }
    }

    const newToken = await this.handleTokenForExistingParticipant(
      participant,
      existingParticipant,
      surveyId,
      context,
      repoSurveyParticipant,
    )

    if (newToken) {
      updateData.token = newToken
    }

    await repoSurveyParticipant.updateOne(
      {
        _id: existingParticipant._id,
        surveyId,
      },
      { $set: updateData },
      { context },
    )
  }

  /**
   * Create a new participant
   */
  private async createNewParticipant(
    participant: ImportRow,
    surveyId: string,
    context: DataSourceContext,
    repoSurveyParticipant: RepoSurveyParticipant,
    repoSurvey: RepoSurvey,
    repoSettingSurvey: RepoSettingSurvey,
  ): Promise<void> {
    // Remove _id from CSV to avoid conflicts
    delete participant._id

    // Handle token
    participant.token = await this.handleTokenForNewParticipant(
      participant,
      surveyId,
      context,
      repoSurveyParticipant,
      repoSurvey,
      repoSettingSurvey,
    )

    // Remove internal tracking fields before creating
    const { _rowNumber, ...participantData } = participant

    // Create the participant (inviteSentAt/reminderSentAt were normalized to
    // Date | null above, despite the ImportRow field type of `unknown`).
    // emailVerifyToken is never sourced from CSV data - ImportRow has no such
    // field and COLUMN_MAPPINGS never maps a column onto it - always generate
    // a fresh one server-side.
    await repoSurveyParticipant.create(
      new SurveyParticipant({
        ...(participantData as Partial<PropsOf<SurveyParticipant>>),
        emailVerifyToken: EmailVerifyToken.generate(),
      }),
      { context },
    )
  }

  /**
   * Process a single participant from the import
   */
  private async processParticipant(
    participant: ImportRow,
    surveyId: string,
    context: DataSourceContext,
    defaultLanguage: string,
    createdById: string,
    repoSurveyParticipant: RepoSurveyParticipant,
    repoSurvey: RepoSurvey,
    repoSettingSurvey: RepoSettingSurvey,
  ): Promise<void> {
    // Validate required fields
    const validation = this.validateParticipant(participant)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Set survey and project context
    this.setParticipantContext(
      participant,
      surveyId,
      defaultLanguage,
      createdById,
    )

    // Check if participant with same email already exists
    const existingByEmail = await repoSurveyParticipant.findOne(
      {
        surveyId,
        email: participant.email.toLowerCase().trim(),
      },
      { context },
    )

    if (existingByEmail) {
      await this.updateExistingParticipant(
        existingByEmail,
        participant,
        surveyId,
        context,
        repoSurveyParticipant,
      )
    } else {
      await this.createNewParticipant(
        participant,
        surveyId,
        context,
        repoSurveyParticipant,
        repoSurvey,
        repoSettingSurvey,
      )
    }
  }

  /**
   * Normalize CSV headers to internal field names
   */
  private normalizeHeaders(
    row: Record<string, string>,
    customAttributeNames: Set<string>,
  ): ImportRow {
    const normalized: ImportRow = {}
    const attributes: Record<string, string> = {}

    for (const [key, value] of Object.entries(row)) {
      const trimmedKey = key.trim()
      const normalizedKey = this.COLUMN_MAPPINGS[trimmedKey.toLowerCase()]
      if (normalizedKey) {
        ;(normalized as Record<string, unknown>)[normalizedKey] =
          value?.trim() || ''
      } else if (
        customAttributeNames.has(trimmedKey) &&
        isValidCustomAttributeName(trimmedKey).valid
      ) {
        attributes[trimmedKey] = (value?.trim() || '').slice(
          0,
          SCHEMA_LENGTH_MAX_PARTICIPANT_ATTRIBUTE_VALUE,
        )
      }
    }

    if (Object.keys(attributes).length > 0) {
      normalized.attributes = attributes
    }

    return normalized
  }
}

export default ServiceSurveyParticipantImport
