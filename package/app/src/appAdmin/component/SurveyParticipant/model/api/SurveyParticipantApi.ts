import { SurveyParticipant, CompletionStatus } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { Api, ErrorRest } from 'model'

export interface SurveyParticipantListApiResponse {
  participants: PropsOf<SurveyParticipant>[]
  participantCount: number
}

export class SurveyParticipantApi extends Api {
  async getAll(
    surveyId: string,
    page: number = 1,
    perPage: number = 20,
    search?: string,
    completionStatus?: CompletionStatus,
  ): Promise<SurveyParticipantListApiResponse> {
    try {
      return await this.getClient().get<SurveyParticipantListApiResponse>(
        `/survey-participant/${surveyId}`,
        {
          params: {
            page,
            perPage,
            search,
            completionStatus,
          },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async getOne(
    surveyId: string,
    participantId: string,
  ): Promise<PropsOf<SurveyParticipant>> {
    try {
      return await this.getClient().get<PropsOf<SurveyParticipant>>(
        `/survey-participant/${surveyId}/${participantId}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async create(
    surveyId: string,
    participant: Partial<PropsOf<SurveyParticipant>>,
  ): Promise<PropsOf<SurveyParticipant>> {
    try {
      return await this.getClient().post<PropsOf<SurveyParticipant>>(
        `/survey-participant/${surveyId}`,
        { participant },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async update(
    surveyId: string,
    participantId: string,
    participant: Partial<PropsOf<SurveyParticipant>>,
  ): Promise<PropsOf<SurveyParticipant>> {
    try {
      return await this.getClient().put<PropsOf<SurveyParticipant>>(
        `/survey-participant/${surveyId}/${participantId}`,
        { participant },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async delete(
    surveyId: string,
    participantId: string | string[],
  ): Promise<{ deletedCount: number }> {
    try {
      const ids = Array.isArray(participantId)
        ? participantId.join(',')
        : participantId
      return await this.getClient().delete<{ deletedCount: number }>(
        `/survey-participant/${surveyId}/${ids}`,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async resetInviteStatus(
    surveyId: string,
    participantId: string | string[],
  ): Promise<{ updatedCount: number }> {
    try {
      const ids = Array.isArray(participantId)
        ? participantId.join(',')
        : participantId
      return await this.getClient().put<{ updatedCount: number }>(
        `/survey-participant/${surveyId}/${ids}/reset-invite-status`,
        {},
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async resetReminderStatus(
    surveyId: string,
    participantId: string | string[],
  ): Promise<{ updatedCount: number }> {
    try {
      const ids = Array.isArray(participantId)
        ? participantId.join(',')
        : participantId
      return await this.getClient().put<{ updatedCount: number }>(
        `/survey-participant/${surveyId}/${ids}/reset-reminder-status`,
        {},
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async import(
    surveyId: string,
    file: File,
    onProgress?: (data: {
      type: 'progress' | 'error' | 'complete'
      imported: number
      errors: number
      batchErrors?: Array<{ row: number; message: string }>
      message?: string
    }) => void,
  ): Promise<{
    imported: number
    errors: number
  }> {
    try {
      // Read file as text
      const fileText = await file.text()

      // Create a ReadableStream for SSE
      const response = await fetch(
        `${this.getClient().getBaseUrl()}/survey-participant/${surveyId}/import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: String(
              this.getClient().getAxios().defaults.headers['Authorization'] ||
                '',
            ),
          },
          body: JSON.stringify({ file: fileText, batchSize: 500 }),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let result = { imported: 0, errors: 0 }

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (onProgress) {
                onProgress(data)
              }

              if (data.type === 'complete') {
                result = { imported: data.imported, errors: data.errors }
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }

      return result
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async generate(
    surveyId: string,
    count: number,
  ): Promise<{ generatedCount: number }> {
    try {
      return await this.getClient().post<{ generatedCount: number }>(
        `/survey-participant/${surveyId}/generate`,
        { count },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async sendInvites(
    surveyId: string,
    onProgress?: (data: {
      type: 'progress' | 'complete'
      queued: number
      errors: number
      total?: number
      batchErrors?: Array<{ email: string; message: string }>
    }) => void,
  ): Promise<{
    queued: number
    errors: number
  }> {
    try {
      let skip = 0
      let totalQueued = 0
      let totalErrors = 0
      let total = 0
      let hasMore = true
      const allErrors: Array<{ email: string; message: string }> = []
      const batchSize = 100

      while (hasMore) {
        const response = await this.getClient().post<{
          queued: number
          errors: number
          total: number
          hasMore: boolean
          processed: number
          batchErrors: Array<{ email: string; message: string }>
        }>(`/survey-participant/${surveyId}/send-invites`, {
          skip,
          batchSize,
        })

        totalQueued += response.queued
        totalErrors += response.errors
        total = response.total
        hasMore = response.hasMore
        skip = response.processed

        if (response.batchErrors && response.batchErrors.length > 0) {
          allErrors.push(...response.batchErrors)
        }

        // Call progress callback
        if (onProgress) {
          onProgress({
            type: hasMore ? 'progress' : 'complete',
            queued: totalQueued,
            errors: totalErrors,
            total,
            batchErrors: response.batchErrors,
          })
        }
      }

      return {
        queued: totalQueued,
        errors: totalErrors,
      }
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async sendReminders(
    surveyId: string,
    onProgress?: (data: {
      type: 'progress' | 'complete'
      queued: number
      errors: number
      total?: number
      batchErrors?: Array<{ email: string; message: string }>
    }) => void,
  ): Promise<{
    queued: number
    errors: number
  }> {
    try {
      let skip = 0
      let totalQueued = 0
      let totalErrors = 0
      let total = 0
      let hasMore = true
      const allErrors: Array<{ email: string; message: string }> = []
      const batchSize = 100

      while (hasMore) {
        const response = await this.getClient().post<{
          queued: number
          errors: number
          total: number
          hasMore: boolean
          processed: number
          batchErrors: Array<{ email: string; message: string }>
        }>(`/survey-participant/${surveyId}/send-reminders`, {
          skip,
          batchSize,
        })

        totalQueued += response.queued
        totalErrors += response.errors
        total = response.total
        hasMore = response.hasMore
        skip = response.processed

        if (response.batchErrors && response.batchErrors.length > 0) {
          allErrors.push(...response.batchErrors)
        }

        // Call progress callback
        if (onProgress) {
          onProgress({
            type: hasMore ? 'progress' : 'complete',
            queued: totalQueued,
            errors: totalErrors,
            total,
            batchErrors: response.batchErrors,
          })
        }
      }

      return {
        queued: totalQueued,
        errors: totalErrors,
      }
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  getExportUrl(
    surveyId: string,
    ids?: string[],
  ): { url: string; headers: Record<string, string> } {
    const baseUrl = this.getClient().getBaseUrl()
    const params = new URLSearchParams()

    if (ids && ids.length > 0) {
      params.append('ids', ids.join(','))
    }

    const url = `${baseUrl}/survey-participant/${surveyId}/export${params.toString() ? `?${params.toString()}` : ''}`

    // Get the Authorization header from the client
    const headers: Record<string, string> = {}
    const authHeader =
      this.getClient().getAxios().defaults.headers['Authorization']
    if (authHeader) {
      headers['Authorization'] = String(authHeader)
    }

    return { url, headers }
  }
}
