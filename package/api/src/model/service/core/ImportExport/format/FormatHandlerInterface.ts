import { Readable } from 'stream'

export type ExportOptions = Record<string, string | boolean | undefined>

export interface FormatHandlerInterface {
  format: string
  extensions: string[]

  serialize(data: unknown): Readable

  parse(input: Readable, context?: { importFileId?: string }): Promise<unknown>

  getFilename(
    entityType: string,
    entityId: string,
    options?: ExportOptions,
  ): string

  getMimeType(): string
}
