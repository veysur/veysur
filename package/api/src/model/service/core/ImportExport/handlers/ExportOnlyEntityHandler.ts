import { Readable } from 'stream'

import { ServerErrorBadRequest } from '@datacapy/server'

import {
  EntityHandlerInterface,
  EntityExportContext,
  ExportOptions,
  ImportValidationResult,
  PersistImportContext,
} from '../EntityHandlerInterface'
import { FormatHandlerInterface } from '../format/FormatHandlerInterface'

/**
 * Abstract base class for export-only entity handlers
 *
 * Provides default throwing implementations for import methods so subclasses
 * only need to implement the export-side of EntityHandlerInterface.
 */
export abstract class ExportOnlyEntityHandler implements EntityHandlerInterface {
  abstract entityType: string

  abstract fetchForExport(
    entityId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<unknown>

  abstract prepareExportData(
    data: unknown,
    formatHandler: FormatHandlerInterface,
    options?: ExportOptions,
  ): Promise<Readable>

  abstract getSupportedFormats(): string[]

  abstract getDefaultFormat(): string

  parseImportData(
    _input: Readable,
    _formatHandler: FormatHandlerInterface,
    _context?: { importFileId?: string },
  ): never {
    throw new ServerErrorBadRequest({
      message: `${this.entityType} import is not supported`,
    })
  }

  async validateImport(
    _data: unknown,
    _options: { force?: boolean; projectId: string; aclContext: unknown },
  ): Promise<ImportValidationResult> {
    throw new ServerErrorBadRequest({
      message: `${this.entityType} import is not supported`,
    })
  }

  async persistImport(
    _data: unknown,
    _context: PersistImportContext,
  ): Promise<never> {
    throw new ServerErrorBadRequest({
      message: `${this.entityType} import is not supported`,
    })
  }
}
