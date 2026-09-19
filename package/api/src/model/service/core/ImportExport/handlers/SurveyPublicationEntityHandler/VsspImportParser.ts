import { Readable } from 'stream'

import { ServerErrorBadRequest } from 'mzen-server'

import { EntityEmbeddedFileManifestEntry } from '../../EntityHandlerInterface'
import { FormatHandlerInterface } from '../../format/FormatHandlerInterface'
import { ArchiveReader } from '../../format/ArchiveReader'
import { RawJson, VsspParsedBundle } from './types'

export class VsspImportParser {
  async parse(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<VsspParsedBundle> {
    const reader = (await formatHandler.parse(input, context)) as ArchiveReader

    const requiredFiles = ['surveyPublication.json', 'surveySnapshotData.json']
    for (const filename of requiredFiles) {
      if (!reader.getJson(filename)) {
        await reader.cleanup()
        throw new ServerErrorBadRequest({
          message: `Missing required file in VSP: ${filename}`,
        })
      }
    }

    const publication = reader.getJson<RawJson>('surveyPublication.json')
    const snapshotData = reader.getJson<RawJson>('surveySnapshotData.json')
    const snapshot = reader.getJson<RawJson>('surveySnapshot.json') ?? null
    const surveyLanguageSnapshots =
      reader.getJson<RawJson[]>('surveyLanguageSnapshots.json') ?? []

    const responseBatchKeys = reader
      .listEntries()
      .filter(
        (name) => name.startsWith('responses/batch-') && name.endsWith('.json'),
      )
      .sort()

    let embeddedFileEntries: EntityEmbeddedFileManifestEntry[] = []
    const manifest = reader.getJson<{
      version: string
      files: EntityEmbeddedFileManifestEntry[]
    }>('files/manifest.json')
    if (manifest) {
      embeddedFileEntries = manifest.files ?? []
    }

    return {
      publication,
      snapshotData,
      snapshot,
      surveyLanguageSnapshots,
      responseBatchKeys,
      embeddedFileEntries,
      parsedData: reader,
    }
  }
}
