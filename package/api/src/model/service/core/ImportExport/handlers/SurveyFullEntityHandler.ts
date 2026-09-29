import { Readable } from 'stream'

import { ServerErrorBadRequest } from '@datacapy/server'

import {
  RepoEmailTemplate,
  RepoFile,
  RepoSurvey,
  RepoSurveyLanguage,
  RepoSurveyLanguageSnapshot,
  RepoSurveyParticipant,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
  RepoSurveyParticipantAttributeSnapshot,
  RepoSurveyParticipantAttributeLanguageSnapshot,
  RepoSurveyPublication,
  RepoSurveyElement,
  RepoSurveySection,
  RepoSurveyResponse,
  RepoSurveySnapshotPartial,
  RepoSurveySnapshot,
} from 'model'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import {
  EntityHandlerInterface,
  EntityExportContext,
  ExportOptions,
  ImportValidationResult,
  PersistImportContext,
} from '../EntityHandlerInterface'
import { FormatHandlerInterface } from '../format/FormatHandlerInterface'
import { SurveyEntityHandler } from './SurveyEntityHandler'
import { SurveyPublicationEntityHandler } from './SurveyPublicationEntityHandler'
import { VsspParsedBundle } from './SurveyPublicationEntityHandler/types'
import {
  VsstParsedBundle,
  VsstResolvedContext,
} from './SurveyEntityHandler/types'
import { VssaExportCollector } from './SurveyFullEntityHandler/VssaExportCollector'
import {
  VssaImportParser,
  VssaParsedData,
  VssaPublicationBundle,
} from './SurveyFullEntityHandler/VssaImportParser'

/**
 * Internal payload threaded from validateImport through to persistImport for
 * the .vssa flow — a synthesized survey resolution plus the raw per-publication
 * bundles collected during parsing, kept around so each publication can be
 * resolved/persisted against the newly created surveyId.
 */
type VssaValidatedData = {
  vsstResolved: VsstResolvedContext
  parsedData: VssaParsedData['parsedData']
  snapshotBundles: VssaParsedData['snapshotBundles']
  snapshotLanguagesMap: VssaParsedData['snapshotLanguagesMap']
  publications: VssaPublicationBundle[]
  embeddedFileEntries: VssaParsedData['embeddedFileEntries']
  responseFileEntries: VssaParsedData['responseFileEntries']
  force: boolean
}

/**
 * Survey full entity handler for combined import/export
 *
 * Exports and imports a complete survey snapshot — live survey template
 * plus all publications — as a single flat .vssa ZIP archive.
 *
 * The .vssa format uses a flat hierarchy with native deduplication:
 *   survey.json                     ← survey + groups + questions
 *   files/manifest.json + images    ← shared file manifest (deduplicated)
 *   snapshots/{id}.json             ← snapshot metadata (one per unique snapshot)
 *   snapshotData/{id}.json          ← snapshot data (one per unique snapshot)
 *   publications/{id}.json          ← publication record
 *   responses/{id}/batch-000001.json  ← response batches for that publication
 *
 * SurveyFullEntityHandler (orchestrator)
 * ├── VssaExportCollector  — collect survey + pub data; assemble flat entries
 * └── VssaImportParser     — extract flat ZIP; return typed VssaParsedData
 *
 * Import lifecycle:
 *   parseImportData  → VssaImportParser extracts flat ZIP
 *   validateImport   → validates survey; stores pub/snapshot data for persistence
 *   persistImport    → persists survey → surveyId; resolves+persists each pub
 *                      linked to the new surveyId
 */
export class SurveyFullEntityHandler implements EntityHandlerInterface {
  entityType = 'surveyFull'

  private surveyHandler: SurveyEntityHandler
  private pubHandler: SurveyPublicationEntityHandler
  private collector: VssaExportCollector
  private parser: VssaImportParser

  constructor(
    repoSurvey: RepoSurvey,
    repoSurveyResponse: RepoSurveyResponse,
    repoSurveyPublication: RepoSurveyPublication,
    repoSurveySnapshot: RepoSurveySnapshot,
    repoSurveySnapshotPartial: RepoSurveySnapshotPartial,
    repoSurveyParticipant: RepoSurveyParticipant,
    repoSurveyElement: RepoSurveyElement,
    repoSurveySection: RepoSurveySection,
    repoSurveyLanguage?: RepoSurveyLanguage,
    repoSurveyLanguageSnapshot?: RepoSurveyLanguageSnapshot,
    repoFile?: RepoFile,
    storageConfig?: StorageConfig,
    repoSurveyParticipantAttribute?: RepoSurveyParticipantAttribute,
    repoSurveyParticipantAttributeLanguage?: RepoSurveyParticipantAttributeLanguage,
    repoSurveyParticipantAttributeSnapshot?: RepoSurveyParticipantAttributeSnapshot,
    repoSurveyParticipantAttributeLanguageSnapshot?: RepoSurveyParticipantAttributeLanguageSnapshot,
    repoEmailTemplate?: RepoEmailTemplate,
  ) {
    this.surveyHandler = new SurveyEntityHandler(
      repoSurvey,
      repoSurveyLanguage,
      repoFile,
      storageConfig,
      repoSurveyParticipantAttribute,
      repoSurveyParticipantAttributeLanguage,
      repoEmailTemplate,
    )
    this.pubHandler = new SurveyPublicationEntityHandler(
      repoSurveyResponse,
      repoSurveyPublication,
      repoSurveySnapshot,
      repoSurveySnapshotPartial,
      repoSurvey,
      repoSurveyParticipant,
      repoSurveyElement,
      repoSurveySection,
      repoSurveyLanguageSnapshot,
      repoFile,
      storageConfig,
      repoSurveyParticipantAttributeSnapshot,
      repoSurveyParticipantAttributeLanguageSnapshot,
    )
    this.collector = new VssaExportCollector(
      repoSurveyPublication,
      this.surveyHandler,
      this.pubHandler,
      storageConfig,
    )
    this.parser = new VssaImportParser()
  }

  async fetchForExport(
    surveyId: string,
    context: EntityExportContext,
    _options?: ExportOptions,
  ): Promise<unknown> {
    return { surveyId, context }
  }

  async prepareExportData(
    data: unknown,
    formatHandler: FormatHandlerInterface,
    _options?: ExportOptions,
  ): Promise<Readable> {
    const { surveyId, context } = data as {
      surveyId: string
      context: EntityExportContext
    }
    const { entries, cleanup: innerCleanup } = await this.collector.collect(
      surveyId,
      context,
    )
    const stream = formatHandler.serialize(entries)
    stream.on('end', () => innerCleanup())
    stream.on('error', () => innerCleanup())
    return stream
  }

  async parseImportData(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<VssaParsedData> {
    return this.parser.parse(input, formatHandler, context)
  }

  async validateImport(
    data: VssaParsedData,
    options: {
      force?: boolean
      projectId: string
      aclContext: PersistImportContext['aclContext']
    },
  ): Promise<ImportValidationResult<VssaValidatedData>> {
    const {
      surveyData,
      surveyLanguages,
      participantAttributes,
      emailTemplates,
      embeddedFileEntries,
      responseFileEntries,
      parsedData,
    } = data

    // Synthesize VsstParsedBundle from flat vssa data and validate the survey.
    // VssaParsedData's surveyData uses the untyped RawJson/StructuralSurveyJson
    // shapes (archive contents in general); VsstParsedBundle narrows `_id` to
    // required — an exported .vssa always carries `_id` on these entities.
    const vsstBundle: VsstParsedBundle = {
      surveyData: {
        ...surveyData,
        surveyLanguages: surveyLanguages ?? [],
        participantAttributes: participantAttributes ?? [],
        emailTemplates: emailTemplates ?? [],
      } as VsstParsedBundle['surveyData'],
      embeddedFileEntries,
      parsedData,
    }

    let vsstValidation: ImportValidationResult<VsstResolvedContext>
    try {
      // this.surveyHandler.validateImport()'s return type also covers the
      // markdown-format resolved shape, but vsstBundle above is always
      // vsst-shaped, so the result is always ImportValidationResult<VsstResolvedContext>.
      vsstValidation = (await this.surveyHandler.validateImport(
        vsstBundle,
        options,
      )) as ImportValidationResult<VsstResolvedContext>
    } catch (err) {
      await data.cleanup()
      throw err
    }

    return {
      valid: vsstValidation.valid,
      errors: vsstValidation.errors,
      repairs: vsstValidation.repairs,
      discards: vsstValidation.discards,
      hasIdTranslations: vsstValidation.hasIdTranslations,
      data: {
        vsstResolved: vsstValidation.data,
        parsedData,
        snapshotBundles: data.snapshotBundles,
        snapshotLanguagesMap: data.snapshotLanguagesMap,
        publications: data.publications,
        embeddedFileEntries,
        responseFileEntries,
        force: options.force ?? false,
      },
    }
  }

  async persistImport(
    data: unknown,
    context: PersistImportContext,
  ): Promise<{
    entityId: string
    hasIdTranslations?: boolean
    warnings?: unknown[]
  }> {
    const {
      vsstResolved,
      parsedData,
      snapshotBundles,
      snapshotLanguagesMap,
      publications,
      embeddedFileEntries,
      responseFileEntries,
      force,
    } = data as VssaValidatedData

    try {
      // Persist the survey template first to obtain the new surveyId
      const surveyResult = await this.surveyHandler.persistImport(
        vsstResolved,
        context,
      )
      const surveyId = surveyResult.entityId
      const warnings: unknown[] = [...(surveyResult.warnings ?? [])]

      // Resolve and persist each publication linked to the newly created survey
      for (const pub of publications) {
        const snapshotBundle = snapshotBundles.get(pub.snapshotId) ?? {
          snapshot: null,
          snapshotData: null,
        }

        // Synthesize VsspParsedBundle using shared parsedData and snapshot data
        const vsspBundle: VsspParsedBundle = {
          publication: pub.publication,
          snapshot: snapshotBundle.snapshot,
          snapshotData: snapshotBundle.snapshotData,
          surveyLanguageSnapshots:
            snapshotLanguagesMap?.get(pub.snapshotId) ?? [],
          responseBatchKeys: pub.responseBatchKeys,
          embeddedFileEntries,
          responseFileEntries,
          parsedData,
        }

        const vsspValidation = await this.pubHandler.validateImport(
          vsspBundle,
          {
            force: force ?? false,
            projectId: context.projectId,
            aclContext: context.aclContext,
            surveyId,
          },
        )

        if (!vsspValidation.valid && !force) {
          throw new ServerErrorBadRequest({
            message: `Publication ${pub.publicationId} failed validation`,
            errors: vsspValidation.errors,
          })
        }

        const pubResult = await this.pubHandler.persistImport(
          vsspValidation.data,
          context,
        )
        warnings.push(...(pubResult.warnings ?? []))
      }

      return {
        entityId: surveyId,
        ...(warnings.length > 0 ? { warnings } : {}),
      }
    } finally {
      await parsedData?.cleanup?.()
    }
  }

  getSupportedFormats(): string[] {
    return ['vssa']
  }

  getDefaultFormat(): string {
    return 'vssa'
  }

  /**
   * .vssa always bundles the live survey's own embedded answer-option
   * images (VssaExportCollector.collect() starts from
   * surveyHandler.fetchForExport(), unconditionally, even for a survey with
   * zero publications), plus every publication's own snapshot images and
   * responses. Both components are summed without deduping images that
   * happen to appear in both: an overestimate only risks queueing an export
   * that could have run inline, whereas missing either component risks the
   * opposite — running a multi-megabyte export on the request thread.
   */
  async estimateExportSize(
    entityId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<number> {
    const [surveySize, publicationsSize] = await Promise.all([
      this.surveyHandler.estimateExportSize(entityId, context, options),
      this.pubHandler.estimateExportSize(entityId, context, options),
    ])
    return surveySize + publicationsSize
  }
}
