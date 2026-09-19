import { Readable } from 'stream'

import { FormatHandlerInterface, ExportOptions } from './FormatHandlerInterface'
import { toIsoDateStamp } from './formatHandlerUtils'

export class JsonFormatHandler implements FormatHandlerInterface {
  format = 'json'
  extensions = ['.json']

  serialize(data: unknown): Readable {
    return Readable.from([Buffer.from(JSON.stringify(data, null, 2), 'utf8')])
  }

  async parse(input: Readable): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      input.on('data', (chunk: Buffer) => chunks.push(chunk))
      input.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch (e) {
          reject(e)
        }
      })
      input.on('error', reject)
    })
  }

  getFilename(
    entityType: string,
    entityId: string,
    _options?: ExportOptions,
  ): string {
    const timestamp = toIsoDateStamp() // YYYY-MM-DD
    return `${entityType}-${entityId}-${timestamp}.json`
  }

  getMimeType(): string {
    return 'application/json'
  }
}
