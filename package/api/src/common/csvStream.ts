import { Readable } from 'stream'
import Papa from 'papaparse'
import type { HttpResponse } from '@datacapy/server'

/**
 * Streams data as CSV to the response using batch processing
 */
export async function streamCsv<T>(
  res: HttpResponse,
  filename: string,
  headers: string[],
  dataFetcher: (skip: number, limit: number) => Promise<T[]>,
  rowMapper: (doc: T) => unknown[],
  batchSize: number = 1000,
): Promise<void> {
  async function* lines(): AsyncGenerator<string> {
    yield Papa.unparse([headers]) + '\n'

    let skip = 0
    let hasMore = true

    while (hasMore) {
      const batch = await dataFetcher(skip, batchSize)

      if (batch.length === 0) {
        break
      }

      for (const doc of batch) {
        yield Papa.unparse([rowMapper(doc)]) + '\n'
      }

      skip += batch.length
      hasMore = batch.length === batchSize
    }
  }

  await res.stream(Readable.from(lines()), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

/**
 * Generate CSV filename with date
 */
export function generateCsvFilename(prefix: string, surveyId: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `${prefix}-${surveyId}-${date}.csv`
}
