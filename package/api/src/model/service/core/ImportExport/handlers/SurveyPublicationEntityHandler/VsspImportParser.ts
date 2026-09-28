import { Readable } from 'stream'

import { ServerErrorBadRequest } from 'mzen-server'

import { EntityEmbeddedFileManifestEntry } from '../../EntityHandlerInterface'
import { FormatHandlerInterface } from '../../format/FormatHandlerInterface'
import { ArchiveReader } from '../../format/ArchiveReader'
import { RawJson, ResponseFileManifestEntry, VsspParsedBundle } from './types'

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

    let responseFileEntries: ResponseFileManifestEntry[] = []
    const legacyResponseManifest = reader.getJson<{
      version: string
      files: ResponseFileManifestEntry[]
    }>('files/response-manifest.json')
    if (legacyResponseManifest) {
      // Archives exported before per-bucket manifests were introduced.
      responseFileEntries = legacyResponseManifest.files ?? []
    } else {
      const responseManifestKeys = reader
        .listEntries()
        .filter(
          (name) =>
            name.startsWith('files/response-manifest-') && name.endsWith('.json'),
        )
        .sort()
      for (const key of responseManifestKeys) {
        const bucketManifest = reader.getJson<{
          version: string
          files: ResponseFileManifestEntry[]
        }>(key)
        if (bucketManifest) {
          responseFileEntries.push(...(bucketManifest.files ?? []))
        }
      }
    }

    return {
      publication,
      snapshotData,
      snapshot,
      surveyLanguageSnapshots,
      responseBatchKeys,
      embeddedFileEntries,
      responseFileEntries,
      parsedData: reader,
    }
  }
}
