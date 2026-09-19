import { Api, ErrorRest } from 'model'

export type ExportOptions = Record<string, string | boolean | undefined>

export type GenerateImportUrlRequest = {
  format: string
  options?: Record<string, string | boolean | undefined>
}

export type GenerateImportUrlResponse = {
  fileId: string
  uploadUrl: string
  expiresAt: string
}

export type ValidationError = {
  type: string
  entityType?: string
  entityId?: string
  field?: string
  message: string
  repairable: boolean
  details?: Record<string, unknown>
}

export type ImportValidationError = {
  message: string
  errors: ValidationError[]
  hint?: string
  name?: string
}

export type ProcessImportResponse = {
  success: boolean
  entityId: string
  entityType: string
  hasIdTranslations?: boolean
  repairs?: Array<{ type: string; entity: string; id: string; reason: string }>
  discards?: Array<{ type: string; entity: string; id: string; reason: string }>
  warnings?: string[]
}

export type ExportEntityResponse = {
  fileId: string
  downloadUrl: string
  filename: string
  expiresAt: string
}

export class ImportExportApi extends Api {
  async generateImportUrl(
    entityType: string,
    request: GenerateImportUrlRequest,
  ): Promise<GenerateImportUrlResponse> {
    try {
      return await this.getClient().post<GenerateImportUrlResponse>(
        `/import-export/import/url/${entityType}`,
        request,
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to upload file to storage')
      }
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async processImport(fileId: string): Promise<ProcessImportResponse> {
    try {
      return await this.getClient().post<ProcessImportResponse>(
        `/import-export/import/process/${fileId}`,
        {},
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  async exportEntity(
    entityType: string,
    entityId: string,
    format: string,
    options?: ExportOptions,
  ): Promise<ExportEntityResponse> {
    try {
      return await this.getClient().post<ExportEntityResponse>(
        `/import-export/export/${entityType}/${entityId}/${format}`,
        options ? { options } : {},
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
