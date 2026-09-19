import { Readable } from 'stream'

import { ServerErrorBadRequest } from 'mzen-server'
import { SurveyLanguageData } from 'veysur-common'

import {
  EntityEmbeddedFileManifestEntry,
  EntityParsedData,
} from '../../EntityHandlerInterface'
import { FormatHandlerInterface } from '../../format/FormatHandlerInterface'
import { ArchiveReader } from '../../format/ArchiveReader'
import {
  RawJson,
  StructuralSurveyJson,
} from '../SurveyPublicationEntityHandler/types'
import {
  EmailTemplateEntry,
  VsstParticipantAttribute,
} from '../SurveyEntityHandler/types'

export type VssaSnapshotBundle = {
  snapshot: RawJson | null
  snapshotData: RawJson | null
}

export type VssaPublicationBundle = {
  publicationId: string
  publication: RawJson
  snapshotId: string
  responseBatchKeys: string[]
}

export type VssaParsedData = {
  surveyData: {
    version: string
    survey: StructuralSurveyJson
    sections: RawJson[]
    elements: RawJson[]
  }
  surveyLanguages: Array<{ languageCode: string; data: SurveyLanguageData }>
  participantAttributes: VsstParticipantAttribute[]
  emailTemplates: EmailTemplateEntry[]
  snapshotBundles: Map<string, VssaSnapshotBundle>
  snapshotLanguagesMap: Map<string, RawJson[]>
  publications: VssaPublicationBundle[]
  embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
  parsedData: EntityParsedData
  cleanup: () => Promise<void>
}

export class VssaImportParser {
  async parse(
    stream: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<VssaParsedData> {
    const reader = (await formatHandler.parse(stream, context)) as ArchiveReader

    const surveyData =
      reader.getJson<VssaParsedData['surveyData']>('survey.json')
    if (!surveyData) {
      await reader.cleanup()
      throw new ServerErrorBadRequest({
        message: 'Missing survey.json in .vssa archive',
      })
    }

    let embeddedFileEntries: EntityEmbeddedFileManifestEntry[] = []
    const manifest = reader.getJson<{
      version: string
      files: EntityEmbeddedFileManifestEntry[]
    }>('files/manifest.json')
    if (manifest) {
      embeddedFileEntries = manifest.files ?? []
    }

    const snapshots = new Map<string, RawJson>()
    const snapshotDataMap = new Map<string, RawJson>()
    const publicationMap = new Map<string, RawJson>()
    const responseBatchKeysMap = new Map<string, string[]>()
    const surveyLanguages: Array<{
      languageCode: string
      data: SurveyLanguageData
    }> = []
    const snapshotLanguagesMap = new Map<string, RawJson[]>()
    const participantAttributes: VsstParticipantAttribute[] = []
    const emailTemplates: EmailTemplateEntry[] = []

    for (const name of reader.listEntries()) {
      if (name.startsWith('snapshots/') && name.endsWith('.json')) {
        const snapshotId = name.slice('snapshots/'.length, -'.json'.length)
        const data = reader.getJson<RawJson>(name)
        if (data) snapshots.set(snapshotId, data)
      } else if (name.startsWith('snapshotData/') && name.endsWith('.json')) {
        const snapshotId = name.slice('snapshotData/'.length, -'.json'.length)
        const data = reader.getJson<RawJson>(name)
        if (data) snapshotDataMap.set(snapshotId, data)
      } else if (name.startsWith('publications/') && name.endsWith('.json')) {
        const publicationId = name.slice(
          'publications/'.length,
          -'.json'.length,
        )
        const data = reader.getJson<RawJson>(name)
        if (data) publicationMap.set(publicationId, data)
      } else if (name.startsWith('responses/') && name.endsWith('.json')) {
        const parts = name
          .slice('responses/'.length, -'.json'.length)
          .split('/')
        if (parts.length === 2 && parts[1].startsWith('batch-')) {
          if (!responseBatchKeysMap.has(parts[0]))
            responseBatchKeysMap.set(parts[0], [])
          responseBatchKeysMap.get(parts[0])!.push(name)
        }
      } else if (
        name.startsWith('surveyLanguages/') &&
        name.endsWith('.json')
      ) {
        const data = reader.getJson<{
          languageCode: string
          data: SurveyLanguageData
        }>(name)
        if (data) surveyLanguages.push(data)
      } else if (
        name.startsWith('participantAttributes/') &&
        name.endsWith('.json')
      ) {
        const data = reader.getJson<VsstParticipantAttribute>(name)
        if (data) participantAttributes.push(data)
      } else if (name.startsWith('templates/') && name.endsWith('.json')) {
        const data = reader.getJson<EmailTemplateEntry>(name)
        if (data) emailTemplates.push(data)
      } else if (
        name.startsWith('surveyLanguageSnapshots/') &&
        name.endsWith('.json')
      ) {
        const parts = name
          .slice('surveyLanguageSnapshots/'.length, -'.json'.length)
          .split('/')
        if (parts.length === 2) {
          const [snapshotId] = parts
          const data = reader.getJson<RawJson>(name)
          if (data) {
            if (!snapshotLanguagesMap.has(snapshotId))
              snapshotLanguagesMap.set(snapshotId, [])
            snapshotLanguagesMap.get(snapshotId).push(data)
          }
        }
      }
    }

    const snapshotBundles = new Map<string, VssaSnapshotBundle>()
    for (const [snapshotId, snapshot] of snapshots) {
      snapshotBundles.set(snapshotId, {
        snapshot,
        snapshotData: snapshotDataMap.get(snapshotId) ?? null,
      })
    }
    for (const [snapshotId, snapshotData] of snapshotDataMap) {
      if (!snapshotBundles.has(snapshotId)) {
        snapshotBundles.set(snapshotId, { snapshot: null, snapshotData })
      }
    }

    const publications: VssaPublicationBundle[] = []
    for (const [publicationId, publication] of publicationMap) {
      const snapshotId = publication.snapshotId?.toString() ?? ''
      const responseBatchKeys = (
        responseBatchKeysMap.get(publicationId) ?? []
      ).sort()
      publications.push({
        publicationId,
        publication,
        snapshotId,
        responseBatchKeys,
      })
    }

    return {
      surveyData,
      surveyLanguages,
      participantAttributes,
      emailTemplates,
      snapshotBundles,
      snapshotLanguagesMap,
      publications,
      embeddedFileEntries,
      parsedData: reader,
      cleanup: () => reader.cleanup(),
    }
  }
}
