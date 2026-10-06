import { Readable } from 'stream'

import { ServerErrorBadRequest } from '@datacapy/server'

import { FormatHandlerInterface } from '../../format/FormatHandlerInterface'
import { ArchiveReader } from '../../format/ArchiveReader'
import { ProjectParsedBundle } from './types'

const MANIFEST_ENTRY = 'project.json'
const SETTINGS_ENTRY = 'settings/survey.json'
const TEMPLATES_PREFIX = 'templates/'

export class VspsImportParser {
  async parse(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<ProjectParsedBundle> {
    const reader = (await formatHandler.parse(input, context)) as ArchiveReader

    const reject = async (message: string): Promise<never> => {
      await reader.cleanup()
      throw new ServerErrorBadRequest({ message })
    }

    const malformed = reader.getMalformedJsonEntries()
    if (malformed.length > 0) {
      return reject(`Invalid VSPS: malformed JSON in ${malformed.join(', ')}`)
    }

    const manifest = reader.getJson(MANIFEST_ENTRY)
    if (manifest === null) {
      return reject(`Missing required file in VSPS: ${MANIFEST_ENTRY}`)
    }

    const templates = reader
      .listEntries()
      .filter(
        (name) => name.startsWith(TEMPLATES_PREFIX) && name.endsWith('.json'),
      )
      .map((name) => reader.getJson(name))

    return {
      raw: { manifest, settings: reader.getJson(SETTINGS_ENTRY), templates },
      cleanup: () => reader.cleanup(),
    }
  }
}
