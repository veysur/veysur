import { DataSourceContext } from 'mzen-om'
import {
  Survey,
  SurveyLanguage,
  SurveyLanguageAnswerOptionEntry,
  SurveyAnswerOptionImageValue,
  SurveyParticipantAttribute,
  SurveyParticipantAttributeLanguage,
  SurveyQuestion,
  SurveySection,
  SurveyContent,
  CONTENT_TYPES,
  File,
} from 'veysur-common'
import { genUniqueId } from 'mzen-id'

import {
  createStorageAdaptor,
  generateImageSetBasePath,
  contextForProject,
} from 'common'
import {
  RepoEmailTemplate,
  RepoFile,
  RepoSurvey,
  RepoSurveyLanguage,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
  RepoSurveyElement,
  RepoSurveySection,
} from 'model'
import { AclContext } from 'model/entity/AclContext'
import { StorageConfig } from 'model/service/core/ServiceFile/FileS3Config'

import { EntityParsedData } from '../../EntityHandlerInterface'
import { entityStamp } from '../util/entityStamp'
import {
  FileResolution,
  ResolvedEmailTemplate,
  ResolvedSurveyLanguage,
  VsstResolvedContext,
} from './types'

export class VsstImportPersister {
  constructor(
    private repoSurvey: RepoSurvey,
    private repoSurveyLanguage?: RepoSurveyLanguage,
    private repoFile?: RepoFile,
    private storageConfig?: StorageConfig,
    private repoSurveyParticipantAttribute?: RepoSurveyParticipantAttribute,
    private repoSurveyParticipantAttributeLanguage?: RepoSurveyParticipantAttributeLanguage,
    private repoEmailTemplate?: RepoEmailTemplate,
  ) {}

  async persist(
    data: VsstResolvedContext,
    context: { projectId: string; aclContext: AclContext },
  ): Promise<{ entityId: string; warnings?: unknown[] }> {
    const { projectId, aclContext } = context
    const userId = aclContext.jwt._id

    const dsContext = contextForProject(projectId)

    const repoSection =
      this.repoSurvey.getRepo<RepoSurveySection>('surveySection')
    const repoElement =
      this.repoSurvey.getRepo<RepoSurveyElement>('surveyElement')

    const unrestoredFileIds = await this.uploadBinaryFiles(
      data.fileResolutions,
      data.parsedData,
      dsContext,
    )

    const fileIdMap = this.buildFileIdMap(data.fileResolutions)
    const remappedLanguages = this.remapLanguageImages(
      data.surveyLanguages ?? [],
      fileIdMap,
      data.imageSetIdMap,
      data.survey._id,
      projectId,
    )

    let survey: Survey

    await this.repoSurvey.transaction(dsContext, async (dsContext) => {
      survey = new Survey({ ...data.survey, ...entityStamp(userId) })
      await this.repoSurvey.create(survey, { context: dsContext })

      for (const sectionData of data.sections) {
        // Format boundary: the parsed JSON is structurally a section but typed
        // loosely (`kind` is a plain string). The model constructor narrows it.
        const section = new SurveySection({
          ...sectionData,
          ...entityStamp(userId),
        } as ConstructorParameters<typeof SurveySection>[0])
        await repoSection.insertOne(section, { context: dsContext })
      }

      for (const elementData of data.elements) {
        const input = {
          ...elementData,
          ...entityStamp(userId),
        }
        const elementType = elementData.type
        const isContent =
          elementData.kind === 'content' ||
          (!!elementType &&
            (CONTENT_TYPES as readonly string[]).includes(elementType))
        const element = isContent
          ? new SurveyContent(
              input as ConstructorParameters<typeof SurveyContent>[0],
            )
          : new SurveyQuestion(
              input as ConstructorParameters<typeof SurveyQuestion>[0],
            )
        await repoElement.insertOne(element, {
          context: dsContext,
        })
      }

      if (this.repoSurveyLanguage) {
        for (const langData of remappedLanguages) {
          const surveyLanguage = new SurveyLanguage({
            _id: langData._id ?? genUniqueId(),
            surveyId: data.survey._id,
            languageCode: langData.languageCode,
            data: langData.data ?? {},
          })
          await this.repoSurveyLanguage.insertOne(surveyLanguage, {
            context: dsContext,
          })
        }
      }

      if (this.repoSurveyParticipantAttribute) {
        const participantAttributes = data.participantAttributes ?? []
        if (participantAttributes.length > 0) {
          const attributeDefs = participantAttributes.map((attrData) => ({
            name: attrData.name,
            required: attrData.required,
            internal: false,
            example: attrData.example ?? null,
          }))
          await this.repoSurveyParticipantAttribute.insertOne(
            new SurveyParticipantAttribute({
              surveyId: data.survey._id,
              attributes: attributeDefs,
            }),
            { context: dsContext },
          )

          if (this.repoSurveyParticipantAttributeLanguage) {
            const languageDataMap: Record<
              string,
              Record<string, { label?: string; description?: string }>
            > = {}
            for (const attrData of participantAttributes) {
              for (const [languageCode, langData] of Object.entries(
                attrData.languages ?? {},
              )) {
                if (!langData.label && !langData.description) continue
                if (!languageDataMap[languageCode])
                  languageDataMap[languageCode] = {}
                languageDataMap[languageCode][attrData.name] = langData
              }
            }
            for (const [languageCode, langData] of Object.entries(
              languageDataMap,
            )) {
              await this.repoSurveyParticipantAttributeLanguage.insertOne(
                new SurveyParticipantAttributeLanguage({
                  surveyId: data.survey._id,
                  languageCode,
                  data: langData,
                }),
                { context: dsContext },
              )
            }
          }
        }
      }

      if (this.repoFile) {
        for (const r of data.fileResolutions ?? []) {
          if (r.existingFileId || !r.manifestEntry) continue
          if (unrestoredFileIds.has(r.newFileId)) continue
          await this.repoFile.create(
            new File({
              _id: r.newFileId,
              filename: r.manifestEntry.filename,
              storedFilename: r.manifestEntry.filename,
              hash: r.manifestEntry.hash,
              size: r.manifestEntry.size,
              mimeType: r.manifestEntry.mimeType,
              filePath: r.newFilePath,
              uploadedAt: new Date(),
              createdById: userId,
              surveyId: data.survey._id,
              responseId: null,
              fileContext: r.manifestEntry.fileContext ?? 'survey',
              imageSetId: r.imageSetId,
              imageVariant: r.imageVariant,
              bucketType: 'public',
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              refs: null,
            }),
            { context: dsContext },
          )
        }
      }
    })

    if (this.repoEmailTemplate) {
      await this.persistEmailTemplates(
        data.emailTemplates ?? [],
        survey._id,
        dsContext,
      )
    }

    const warnings: unknown[] = []
    if (unrestoredFileIds.size > 0) {
      const names = (data.fileResolutions ?? [])
        .filter((r) => unrestoredFileIds.has(r.newFileId))
        .map((r) => r.manifestEntry?.filename)
        .filter(Boolean)
      warnings.push({
        message: `${unrestoredFileIds.size} embedded image(s) could not be restored from the archive and were skipped: ${names.join(', ')}`,
      })
    }

    return {
      entityId: survey._id,
      ...(warnings.length > 0 ? { warnings } : {}),
    }
  }

  /**
   * Writes happen after the survey transaction commits, not inside it — a
   * template-write failure does not roll back the already-persisted survey,
   * matching the existing precedent for publications on the .vssa import path.
   */
  private async persistEmailTemplates(
    templates: ResolvedEmailTemplate[],
    surveyId: string,
    dsContext: DataSourceContext,
  ): Promise<void> {
    for (const template of templates) {
      const filter = {
        surveyId,
        type: template.type,
        lang: template.lang,
      }
      const existing = await this.repoEmailTemplate.findOne(filter, {
        context: dsContext,
      })

      if (existing) {
        await this.repoEmailTemplate.updateOne(
          filter,
          {
            $set: {
              subject: template.subject,
              body: template.body,
              updatedAt: new Date(),
            },
          },
          { context: dsContext },
        )
      } else {
        await this.repoEmailTemplate.create(
          {
            surveyId,
            type: template.type,
            lang: template.lang,
            subject: template.subject,
            body: template.body,
          },
          { context: dsContext },
        )
      }
    }
  }

  /**
   * Copies each new (non-dedup, non-resurrect) file's bytes from its temp
   * archive location to its final storage path. Returns the `newFileId`s
   * whose archive entry could not be located (`getBinaryS3Key` came back
   * empty) — the caller must not create a `File` record for these, since
   * without a copy that record would point at a path that was never
   * written. See the `uploadBinaryFiles` counterpart in
   * `SurveyPublicationEntityHandler/VsspImportPersister.ts` for the same
   * pattern applied to per-publication images and response files.
   */
  private async uploadBinaryFiles(
    fileResolutions: FileResolution[],
    parsedData: EntityParsedData,
    dsContext: DataSourceContext,
  ): Promise<Set<string>> {
    const unrestoredFileIds = new Set<string>()
    const adaptor =
      this.storageConfig && this.repoFile
        ? createStorageAdaptor(this.storageConfig)
        : null

    for (const r of fileResolutions ?? []) {
      if (r.existingFileId && r.resurrect && this.repoFile) {
        await this.repoFile.updateOne(
          { _id: r.existingFileId },
          { $set: { deletedAt: null } },
          { context: dsContext },
        )
        continue
      }
      if (r.existingFileId || !adaptor || !r.manifestEntry) continue
      const tempKey = parsedData.getBinaryS3Key(
        r.manifestEntry.archiveEntryPath,
      )
      if (!tempKey) {
        unrestoredFileIds.add(r.newFileId)
        continue
      }
      await adaptor.copyObject({
        Bucket: this.storageConfig.publicBucket,
        Key: r.newFilePath,
        CopySource: `${this.storageConfig.privateBucket}/${tempKey}`,
        ContentType: r.manifestEntry.mimeType,
      })
    }

    return unrestoredFileIds
  }

  private buildFileIdMap(
    fileResolutions: FileResolution[],
  ): Record<string, { newFileId: string; newFilePath: string }> {
    const fileIdMap: Record<
      string,
      { newFileId: string; newFilePath: string }
    > = {}
    for (const r of fileResolutions ?? []) {
      if (r.manifestEntry?.fileId) {
        fileIdMap[r.manifestEntry.fileId] = {
          newFileId: r.newFileId,
          newFilePath: r.newFilePath,
        }
      }
    }
    return fileIdMap
  }

  private remapLanguageImages(
    languages: ResolvedSurveyLanguage[],
    fileIdMap: Record<string, { newFileId: string; newFilePath: string }>,
    imageSetIdMap: Record<string, string>,
    surveyId: string,
    projectId: string,
  ): ResolvedSurveyLanguage[] {
    const hasRemap =
      Object.keys(fileIdMap).length > 0 || Object.keys(imageSetIdMap).length > 0

    if (!hasRemap) return languages

    return languages.map((lang) => {
      const answerOptions = lang.data?.answerOptions
      if (!answerOptions) return lang

      const remappedOptions: Record<string, SurveyLanguageAnswerOptionEntry> =
        {}
      for (const [answerId, option] of Object.entries(answerOptions)) {
        if (!option.image) {
          remappedOptions[answerId] = option
          continue
        }

        let remappedImage: SurveyAnswerOptionImageValue = { ...option.image }

        if (remappedImage.fileId && fileIdMap[remappedImage.fileId]) {
          remappedImage = {
            ...remappedImage,
            fileId: fileIdMap[remappedImage.fileId].newFileId,
          }
        }

        if (remappedImage.path) {
          const match = /\/imgset-([^/]+)\//.exec(remappedImage.path)
          if (match) {
            const newSetId = imageSetIdMap[match[1]]
            if (newSetId) {
              const newBase = generateImageSetBasePath(newSetId, {
                projectId,
                surveyId,
                fileContext: 'survey',
              })
              remappedImage = {
                ...remappedImage,
                path: newBase + '/edited.jpg',
              }
            }
          }
        }

        remappedOptions[answerId] = { ...option, image: remappedImage }
      }

      return {
        ...lang,
        data: { ...lang.data, answerOptions: remappedOptions },
      }
    })
  }
}
