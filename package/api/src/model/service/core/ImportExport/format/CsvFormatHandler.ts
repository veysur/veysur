import { Readable } from 'stream'
import Papa from 'papaparse'

import { FormatHandlerInterface, ExportOptions } from './FormatHandlerInterface'
import { toIsoDateStamp } from './formatHandlerUtils'

export class CsvFormatHandler implements FormatHandlerInterface {
  format = 'csv'
  extensions = ['.csv']

  serialize(data: unknown): Readable {
    return Readable.from([
      Buffer.from(Papa.unparse(data as string[][]), 'utf8'),
    ])
  }

  async parse(input: Readable): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      input.on('data', (chunk: Buffer) => chunks.push(chunk))
      input.on('end', () => {
        const content = Buffer.concat(chunks).toString('utf8')
        const result = Papa.parse<string[]>(content, { skipEmptyLines: true })
        resolve(result.data)
      })
      input.on('error', reject)
    })
  }

  getFilename(
    entityType: string,
    entityId: string,
    _options?: ExportOptions,
  ): string {
    const timestamp = toIsoDateStamp()
    return `${entityType}-${entityId}-${timestamp}.csv`
  }

  getMimeType(): string {
    return 'text/csv'
  }
}
