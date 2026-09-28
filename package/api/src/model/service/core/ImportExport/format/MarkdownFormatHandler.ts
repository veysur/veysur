import { Readable } from 'stream'

import { FormatHandlerInterface, ExportOptions } from './FormatHandlerInterface'
import { toIsoDateStamp } from './formatHandlerUtils'

/**
 * Single-file plain-text format (spec: survey-markdown-format.md v1). Modeled
 * on JsonFormatHandler — no tar/gzip, no S3 temp storage, `data`/return value
 * is a plain already-rendered string.
 */
export class MarkdownFormatHandler implements FormatHandlerInterface {
  format = 'markdown'
  extensions = ['.md']

  serialize(data: unknown): Readable {
    return Readable.from([Buffer.from(data as string, 'utf8')])
  }

  async parse(input: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      input.on('data', (chunk: Buffer) => chunks.push(chunk))
      input.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      input.on('error', reject)
    })
  }

  getFilename(
    entityType: string,
    entityId: string,
    _options?: ExportOptions,
  ): string {
    const timestamp = toIsoDateStamp()
    return `${entityType}-${entityId}-${timestamp}.md`
  }

  getMimeType(): string {
    return 'text/markdown'
  }
}
