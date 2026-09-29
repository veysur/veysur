import { Readable } from 'stream'

import { ServerErrorBadRequest } from '@datacapy/server'

import { EntityEmbeddedFileManifestEntry } from '../../EntityHandlerInterface'
import { FormatHandlerInterface } from '../../format/FormatHandlerInterface'
import { ArchiveReader } from '../../format/ArchiveReader'
import { VsstParsedBundle } from './types'

type SurveyData = VsstParsedBundle['surveyData']

export class VsstImportParser {
  async parse(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<VsstParsedBundle> {
    const reader = (await formatHandler.parse(input, context)) as ArchiveReader

    const surveyData =
      reader.getJson<VsstParsedBundle['surveyData']>('survey.json')
    if (!surveyData) {
      await reader.cleanup()
      throw new ServerErrorBadRequest({
        message: 'Missing required file in VSST: survey.json',
      })
    }

    if (!surveyData.version) {
      await reader.cleanup()
      throw new ServerErrorBadRequest({
        message: 'Invalid VSST format: missing version field',
      })
    }
    if (!surveyData.survey) {
      await reader.cleanup()
      throw new ServerErrorBadRequest({
        message: 'Invalid VSST format: missing survey field',
      })
    }
    if (surveyData.version !== '2.0') {
      await reader.cleanup()
      throw new ServerErrorBadRequest({
        message: `Unsupported VSST format version: ${surveyData.version} (expected 2.0)`,
      })
    }
    if (!Array.isArray(surveyData.sections)) {
      await reader.cleanup()
      throw new ServerErrorBadRequest({
        message: 'Invalid VSST format: sections must be an array',
      })
    }
    if (!Array.isArray(surveyData.elements)) {
      await reader.cleanup()
      throw new ServerErrorBadRequest({
        message: 'Invalid VSST format: elements must be an array',
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

    const readJsonEntries = <T>(prefix: string): T[] =>
      reader
        .listEntries()
        .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
        .map((name) => reader.getJson<T>(name))
        .filter((entry): entry is T => entry != null)

    surveyData.surveyLanguages =
      readJsonEntries<NonNullable<SurveyData['surveyLanguages']>[number]>(
        'surveyLanguages/',
      )

    surveyData.participantAttributes = readJsonEntries<
      NonNullable<SurveyData['participantAttributes']>[number]
    >('participantAttributes/')

    surveyData.emailTemplates =
      readJsonEntries<NonNullable<SurveyData['emailTemplates']>[number]>(
        'templates/',
      )

    return { surveyData, embeddedFileEntries, parsedData: reader }
  }
}
