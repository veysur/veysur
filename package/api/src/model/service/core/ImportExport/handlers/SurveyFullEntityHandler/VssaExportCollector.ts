import { Readable } from 'stream'

import { Survey, SurveyLanguage } from 'veysur-common'

import { createStorageAdaptor, contextForProject } from 'common'
import { RepoSurveyPublication } from 'model'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import {
  EntityExportContext,
  FormatFileEntry,
  EntityEmbeddedFileManifestEntry,
} from '../../EntityHandlerInterface'
import {
  RawJson,
  ResponseFileManifestEntry,
} from '../SurveyPublicationEntityHandler/types'
import { buildStructuralSurveyJson } from '../util/buildStructuralSurveyJson'
import { SurveyEntityHandler } from '../SurveyEntityHandler'
import {
  EmailTemplateEntry,
  VsstParticipantAttribute,
} from '../SurveyEntityHandler/types'
import { SurveyPublicationEntityHandler } from '../SurveyPublicationEntityHandler'

export class VssaExportCollector {
  constructor(
    private repoSurveyPublication: RepoSurveyPublication,
    private surveyHandler: SurveyEntityHandler,
    private pubHandler: SurveyPublicationEntityHandler,
    private storageConfig?: StorageConfig,
  ) {}

  async collect(
    surveyId: string,
    context: EntityExportContext,
  ): Promise<{ entries: FormatFileEntry[]; cleanup: () => Promise<void> }> {
    const dsContext = contextForProject(context.projectId)

    // Fetch survey data and build survey.json
    const surveyData = (await this.surveyHandler.fetchForExport(
      surveyId,
      context,
    )) as {
      survey: Survey
      surveyLanguages: SurveyLanguage[]
      embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
      participantAttributes?: VsstParticipantAttribute[]
      emailTemplates?: EmailTemplateEntry[]
    }

    const surveyJson = buildStructuralSurveyJson(surveyData.survey)

    const seenImageSets = new Set<string>(
      (surveyData.embeddedFileEntries ?? []).map((e) => e.imageSetId),
    )
    const seenSnapshotIds = new Set<string>()
    const allFileEntries: EntityEmbeddedFileManifestEntry[] = [
      ...(surveyData.embeddedFileEntries ?? []),
    ]
    const allResponseFileEntries: ResponseFileManifestEntry[] = []

    const entries: FormatFileEntry[] = [
      {
        filename: 'survey.json',
        content: JSON.stringify(surveyJson, null, 2),
      },
    ]

    for (const lang of surveyData.surveyLanguages ?? []) {
      entries.push({
        filename: `surveyLanguages/${lang.languageCode}.json`,
        content: JSON.stringify(
          { languageCode: lang.languageCode, data: lang.data ?? {} },
          null,
          2,
        ),
      })
    }

    for (const attribute of surveyData.participantAttributes ?? []) {
      entries.push({
        filename: `participantAttributes/${attribute.name}.json`,
        content: JSON.stringify(attribute, null, 2),
      })
    }

    for (const template of surveyData.emailTemplates ?? []) {
      entries.push({
        filename: `templates/${template.type}-${template.lang}.json`,
        content: JSON.stringify(template, null, 2),
      })
    }

    const publications = await this.repoSurveyPublication.find(
      { surveyId },
      { context: dsContext },
    )

    for (const pub of publications) {
      const pubId = pub._id.toString()
      const pubData = (await this.pubHandler.fetchForExport(surveyId, context, {
        publicationId: pubId,
      })) as {
        publication: RawJson
        snapshot: RawJson | null
        snapshotData: RawJson
        surveyLanguageSnapshots: RawJson[]
        responseEntries: FormatFileEntry[]
        publicationId: string
        embeddedFileEntries: EntityEmbeddedFileManifestEntry[]
        responseFileEntries?: ResponseFileManifestEntry[]
      }

      entries.push({
        filename: `publications/${pubId}.json`,
        content: JSON.stringify(pubData.publication, null, 2),
      })

      for (const entry of pubData.responseEntries ?? []) {
        entries.push({
          ...entry,
          filename: `responses/${pubId}/${entry.filename.slice('responses/'.length)}`,
        })
      }

      const snapshotId =
        pubData.snapshot?._id?.toString() ??
        pubData.publication.snapshotId?.toString()
      if (snapshotId && !seenSnapshotIds.has(snapshotId)) {
        seenSnapshotIds.add(snapshotId)
        if (pubData.snapshot) {
          entries.push({
            filename: `snapshots/${snapshotId}.json`,
            content: JSON.stringify(pubData.snapshot, null, 2),
          })
        }
        if (pubData.snapshotData) {
          entries.push({
            filename: `snapshotData/${snapshotId}.json`,
            content: JSON.stringify(pubData.snapshotData, null, 2),
          })
        }
        for (const langSnap of pubData.surveyLanguageSnapshots ?? []) {
          entries.push({
            filename: `surveyLanguageSnapshots/${snapshotId}/${langSnap.languageCode}.json`,
            content: JSON.stringify(langSnap, null, 2),
          })
        }
      }

      for (const entry of pubData.embeddedFileEntries ?? []) {
        if (!seenImageSets.has(entry.imageSetId)) {
          seenImageSets.add(entry.imageSetId)
          allFileEntries.push(entry)
        }
      }

      // Response files are per-response and per-fileId unique already
      // (never shared across publications), so no dedup keying is needed
      // here, unlike the image-set entries above.
      allResponseFileEntries.push(...(pubData.responseFileEntries ?? []))
    }

    if (allFileEntries.length > 0) {
      const manifest = { version: '1.0', files: allFileEntries }
      entries.push({
        filename: 'files/manifest.json',
        content: JSON.stringify(manifest, null, 2),
      })
      for (const entry of allFileEntries) {
        entries.push({
          filename: entry.zipPath,
          size: entry.size,
          stream: this.makeBinaryFileStream(entry),
        })
      }
    }

    if (allResponseFileEntries.length > 0) {
      const responseManifest = {
        version: '1.0',
        files: allResponseFileEntries,
      }
      entries.push({
        filename: 'files/response-manifest.json',
        content: JSON.stringify(responseManifest, null, 2),
      })
      for (const entry of allResponseFileEntries) {
        entries.push({
          filename: entry.zipPath,
          size: entry.size,
          stream: this.makeBinaryFileStream(entry),
        })
      }
    }

    return {
      entries,
      cleanup: async () => {},
    }
  }

  private makeBinaryFileStream(entry: { s3Key: string }): () => Promise<Readable> {
    return async () => {
      const adaptor = createStorageAdaptor(this.storageConfig)
      try {
        const result = await adaptor.getObject({
          Bucket: this.storageConfig.publicBucket,
          Key: entry.s3Key,
        })
        return result.Body as Readable
      } catch {
        return Readable.from([])
      }
    }
  }
}
