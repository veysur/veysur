import { Readable } from 'stream'

import { AclConditions, AclContext } from 'model/entity/AclContext'

import {
  FormatHandlerInterface,
  ExportOptions,
} from './format/FormatHandlerInterface'

export type { ExportOptions }

/**
 * Authorization context passed to import/export handlers for export fetches
 */
export type EntityExportContext = {
  projectId: string
  aclConditions: AclConditions
  aclContext: AclContext
}

/**
 * Generic result of validating imported data — errors, repairs and discards
 * are free-form diagnostic entries surfaced to the caller; entity-specific
 * shapes vary per handler, so callers narrow `data` as needed.
 */
export type ImportValidationResult<TData = unknown> = {
  valid: boolean
  errors?: unknown[]
  data?: TData
  repairs?: unknown[]
  discards?: unknown[]
  warnings?: unknown[]
  hasIdTranslations?: boolean
}

/**
 * Context used when persisting validated import data
 */
export type PersistImportContext = {
  projectId: string
  aclContext: AclContext
  translations?: unknown[]
}

/**
 * Represents a single file entry in a multi-file export (e.g., zip archive)
 */
export type FormatFileEntryInline = { filename: string; content: string }
export type FormatFileEntryPath = { filename: string; path: string }
export type FormatFileEntryStream = {
  filename: string
  size: number
  stream: () => Promise<Readable>
}
export type FormatFileEntry =
  FormatFileEntryInline | FormatFileEntryPath | FormatFileEntryStream

export interface EntityParsedData {
  getJson(name: string): unknown | null
  getBinaryS3Key(name: string): string | null
  listEntries(): string[]
  cleanup(): Promise<void>
  deleteJson?(name: string): void
}

/**
 * Metadata for a binary file embedded in an archive
 */
export type EntityEmbeddedFileManifestEntry = {
  fileId: string
  filename: string // 'edited.jpg' | 'original.jpg' | 'thumb.jpg'
  s3Key: string // source S3 path (for export download)
  mimeType: string
  hash: string | null
  size: number
  archiveEntryPath: string // 'files/${imageSetId}/${imageVariant}.jpg'
  answerOptionId: string
  // Path context — passed to generateImageSetBasePath on import
  fileContext: 'project' | 'survey' | 'response' | 'temp' | 'import' | null
  imageSetId: string
  imageVariant: 'original' | 'edited' | 'thumb'
}

/**
 * Interface for entity-specific import/export handlers
 *
 * Each entity type (survey, surveyResponse, etc.) implements this interface
 * to provide custom fetch, validation, and persistence logic while
 * delegating format-specific serialization to format handlers.
 */
export interface EntityHandlerInterface {
  /**
   * Entity type identifier (e.g., 'survey', 'surveyResponse')
   */
  entityType: string

  /**
   * Fetch entity from database for export
   *
   * @param entityId - ID of the entity to export
   * @param context - Authorization and project context
   * @param options - Optional export options (e.g., publicationId filter)
   * @returns Entity data ready for export
   */
  fetchForExport(
    entityId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<unknown>

  /**
   * Serialize entity data and return a stream for direct S3 upload.
   *
   * No temp files are written to disk. The returned Readable streams the
   * serialized export directly to the caller.
   *
   * @param data - Entity fetched from database
   * @param formatHandler - Format handler that will serialize the data
   * @param options - Optional export options
   * @returns Readable stream of the serialized export
   */
  prepareExportData(
    data: unknown,
    formatHandler: FormatHandlerInterface,
    options?: ExportOptions,
  ): Promise<Readable>

  /**
   * Parse imported file buffer
   *
   * Delegates to format handler but allows entity-specific post-processing
   *
   * @param buffer - Uploaded file buffer
   * @param formatHandler - Format handler for parsing
   * @returns Parsed data structure
   */
  parseImportData(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<unknown>

  /**
   * Validate parsed import data
   *
   * Performs entity-specific validation, detects ID collisions,
   * and optionally repairs data in force mode
   *
   * @param data - Parsed import data
   * @param options - Validation options including force mode
   * @returns Validation result with errors/warnings/repairs
   */
  validateImport(
    data: unknown,
    options: {
      force?: boolean
      projectId: string
      aclContext: AclContext
    },
  ): Promise<ImportValidationResult>

  /**
   * Persist validated import data to database
   *
   * Handles transaction management and entity insertion
   *
   * @param data - Validated (and possibly repaired) data
   * @param context - Project and authorization context
   * @returns Created entity information
   */
  persistImport(
    data: unknown,
    context: PersistImportContext,
  ): Promise<{
    entityId: string
    hasIdTranslations?: boolean
    warnings?: unknown[]
  }>

  /**
   * Get list of supported format names for this entity type
   *
   * @returns Array of format identifiers (e.g., ['vsst', 'json'])
   */
  getSupportedFormats(): string[]

  /**
   * Get default format for this entity type
   *
   * @returns Default format identifier (e.g., 'vsst')
   */
  getDefaultFormat(): string

  /**
   * Estimate the byte size of exporting this entity, used to decide whether
   * to run the export inline or hand it to ServiceDataTransferJob (see
   * ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES). Cheap to compute — either an exact
   * figure from a fetch that's already inexpensive (e.g. SurveyEntityHandler,
   * whose export has no response data), or an approximation where an exact
   * figure would cost as much as doing the export (e.g. response-bearing
   * handlers, which weight by response count rather than walking every
   * response's answers for embedded files). Omitting this method entirely is
   * treated as "always small" — only appropriate for a handler with no
   * bulk content of any kind.
   */
  estimateExportSize?(
    entityId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<number>
}
