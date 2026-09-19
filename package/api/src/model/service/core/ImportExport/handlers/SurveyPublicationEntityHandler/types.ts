import {
  EntityEmbeddedFileManifestEntry,
  EntityParsedData,
} from '../../EntityHandlerInterface'

export type FileResolution = {
  manifestEntry?: EntityEmbeddedFileManifestEntry | null
  existingFileId: string | null
  newFileId: string
  newFilePath: string
  imageSetId: string
  imageVariant: 'original' | 'edited' | 'thumb'
  resurrect: boolean
}

/**
 * Raw JSON blob read from an archive entry — untrusted import data whose
 * shape varies by archive version. Callers narrow the specific fields they
 * read (e.g. `.email`, `.languageCode`) via casts at the read site.
 */
export type RawJson = Record<string, unknown> & { _id?: string }

/**
 * Structural survey JSON (survey + nested sections/elements), as embedded in
 * a snapshot's `survey` field — mirrors the shape produced by serializing a
 * live `Survey` instance to JSON.
 */
export type StructuralSurveyJson = RawJson & {
  sections?: RawJson[]
  elements?: (RawJson & {
    kind?: string
    sectionId?: string
    answerOptions?: (RawJson & { image?: Record<string, unknown> | null })[]
  })[]
  sectionIds?: string[]
  elementIds?: string[]
}

export type ResponseBatchEntry = {
  _id: string
  participantId?: string | null
  participant?: { email?: string } | null
  snapshotId?: string
  publicationId?: string
  sessionId?: string | null
  ip?: string | null
  referrerUrl?: string | null
  answers?: unknown
  completed?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export type ResponseBatchEnvelope = {
  version: string
  exportedAt: string
  entityType: string
  surveyId: string
  publicationId: string | null
  responseCount: number
  responses: ResponseBatchEntry[]
}

export type VsspParsedBundle = {
  publication: RawJson
  snapshotData: RawJson
  snapshot: RawJson | null
  surveyLanguageSnapshots: RawJson[]
  surveyParticipantAttributeSnapshot?: RawJson | null
  surveyParticipantAttributeLanguageSnapshots?: RawJson[]
  responseBatchKeys: string[]
  embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
  parsedData: EntityParsedData
}

export type ResolvedImportContext = VsspParsedBundle & {
  resolvedSurveyId: string
  createSurvey: boolean
  surveyDataForCreate: StructuralSurveyJson | null
  resolvedSnapshotId: string
  createSnapshot: boolean
  resolvedPublicationId: string
  fileResolutions: FileResolution[]
  imageSetIdMap: Record<string, string>
}
