import Papa from 'papaparse'
import type { Response } from 'express'

/**
 * Streams data as CSV to an Express response object using batch processing
 */
export async function streamCsv<T>(
  res: Response,
  filename: string,
  headers: string[],
  dataFetcher: (skip: number, limit: number) => Promise<T[]>,
  rowMapper: (doc: T) => unknown[],
  batchSize: number = 1000,
): Promise<void> {
  // Set headers for CSV download
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  // Write CSV header
  res.write(Papa.unparse([headers]) + '\n')

  // Stream rows in batches
  let skip = 0
  let hasMore = true

  while (hasMore) {
    const batch = await dataFetcher(skip, batchSize)

    if (batch.length === 0) {
      break
    }

    for (const doc of batch) {
      const row = rowMapper(doc)
      res.write(Papa.unparse([row]) + '\n')
    }

    skip += batch.length
    hasMore = batch.length === batchSize
  }

  res.end()
}

/**
 * Generate CSV filename with date
 */
export function generateCsvFilename(prefix: string, surveyId: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `${prefix}-${surveyId}-${date}.csv`
}
