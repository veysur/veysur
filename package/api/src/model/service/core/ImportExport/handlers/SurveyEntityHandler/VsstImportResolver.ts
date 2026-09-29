import DatacapyId from '@datacapy/id'
import { DataSourceContext } from '@datacapy/om'
import {
  SurveyImportIdTranslator,
  SurveyImportValidator,
  SurveyImportRepairer,
  SurveyLanguageData,
} from 'veysur-common'

import { generateImageSetBasePath, contextForProject } from 'common'
import {
  RepoFile,
  RepoSurvey,
  RepoSurveyElement,
  RepoSurveySection,
} from 'model'
import { AclContext } from 'model/entity/AclContext'

import { ImportValidationResult } from '../../EntityHandlerInterface'
import {
  FileResolution,
  ResolvedEmailTemplate,
  ResolvedParticipantAttribute,
  ResolvedSurveyLanguage,
  VsstParsedBundle,
  VsstResolvedContext,
} from './types'

export class VsstImportResolver {
  constructor(
    private repoSurvey: RepoSurvey,
    private repoFile?: RepoFile,
  ) {}

  async resolve(
    bundle: VsstParsedBundle,
    options: { force?: boolean; projectId: string; aclContext: AclContext },
  ): Promise<
    ImportValidationResult<VsstResolvedContext> & { hasIdTranslations: boolean }
  > {
    const { force = false, projectId } = options

    const repoSection =
      this.repoSurvey.getRepo<RepoSurveySection>('surveySection')
    const repoElement =
      this.repoSurvey.getRepo<RepoSurveyElement>('surveyElement')

    const dsContext = contextForProject(projectId)

    const translator = new SurveyImportIdTranslator({
      surveyRepo: this.repoSurvey,
      sectionRepo: repoSection,
      elementRepo: repoElement,
    })

    const { data: translatedData, translations } = await translator.translate(
      bundle.surveyData,
      dsContext,
    )

    const validator = new SurveyImportValidator(force)
    const validationResult = await validator.validate(translatedData)

    if (!validationResult.valid && !force) {
      return {
        valid: false,
        errors: validationResult.errors,
        hasIdTranslations: translations.length > 0,
      }
    }

    let finalData = translatedData
    let repairs: unknown[] = []
    let discards: unknown[] = []

    if (force && !validationResult.valid) {
      const repairer = new SurveyImportRepairer()
      const repairResult = repairer.repair(
        translatedData,
        validationResult.errors,
      )
      finalData = repairResult.data
      repairs = repairResult.repairs
      discards = repairResult.discards
    }

    const surveyId = finalData.survey._id

    const { fileResolutions, imageSetIdMap } = await this.resolveFiles(
      bundle,
      surveyId,
      projectId,
      dsContext,
    )

    // Build entity ID map from translations for language text key remapping
    const idMap = new Map<string, string>()
    for (const t of translations) {
      if (t.originalId && t.newId) idMap.set(t.originalId, t.newId)
    }

    const surveyLanguages: ResolvedSurveyLanguage[] = (
      bundle.surveyData.surveyLanguages ?? []
    ).map((lang) => ({
      _id: lang._id,
      surveyId,
      languageCode: lang.languageCode,
      data: translateLanguageTextKeys(lang.data ?? {}, idMap),
    }))

    const participantAttributes: ResolvedParticipantAttribute[] = (
      bundle.surveyData.participantAttributes ?? []
    ).map((attribute) => ({
      surveyId,
      name: attribute.name,
      required: attribute.required,
      example: attribute.example,
      languages: attribute.languages ?? {},
    }))

    const emailTemplates: ResolvedEmailTemplate[] = (
      bundle.surveyData.emailTemplates ?? []
    ).map((template) => ({
      surveyId,
      type: template.type,
      lang: template.lang,
      subject: template.subject ?? null,
      body: template.body ?? null,
    }))

    return {
      valid: validationResult.valid,
      errors: validationResult.errors,
      data: {
        survey: finalData.survey,
        sections: finalData.sections,
        elements: finalData.elements,
        surveyLanguages,
        participantAttributes,
        emailTemplates,
        embeddedFileEntries: bundle.embeddedFileEntries,
        parsedData: bundle.parsedData,
        fileResolutions,
        imageSetIdMap,
      },
      repairs,
      discards,
      hasIdTranslations: translations.length > 0,
    }
  }

  private async resolveFiles(
    bundle: VsstParsedBundle,
    surveyId: string,
    projectId: string,
    dsContext: DataSourceContext,
  ): Promise<{
    fileResolutions: FileResolution[]
    imageSetIdMap: Record<string, string>
  }> {
    const fileResolutions: FileResolution[] = []
    const imageSetIdMap: Record<string, string> = {}

    if (!this.repoFile) {
      return { fileResolutions, imageSetIdMap }
    }

    const dedupedSets = new Set<string>()

    // Pass 1: edited variants — build imageSetIdMap, handle dedup/resurrection
    for (const entry of (bundle.embeddedFileEntries ?? []).filter(
      (e) => e.imageVariant === 'edited',
    )) {
      const newImageSetId = entry.hash ? entry.hash.substring(0, 16) : DatacapyId()
      imageSetIdMap[entry.imageSetId] = newImageSetId

      const existing = await this.repoFile.findOne(
        {
          imageSetId: newImageSetId,
          imageVariant: 'edited',
          surveyId,
          fileContext: entry.fileContext ?? 'survey',
        },
        { context: dsContext },
      )

      if (existing) {
        const allVariants = await this.repoFile.find(
          { imageSetId: newImageSetId },
          { context: dsContext },
        )
        for (const variant of allVariants) {
          fileResolutions.push({
            existingFileId: variant._id,
            newFileId: variant._id,
            newFilePath: variant.filePath,
            imageSetId: newImageSetId,
            imageVariant: variant.imageVariant as
              'original' | 'edited' | 'thumb',
            resurrect: !!variant.deletedAt,
          })
        }
        dedupedSets.add(newImageSetId)
        continue
      }

      const newFilePath =
        generateImageSetBasePath(newImageSetId, {
          projectId,
          surveyId,
          fileContext: entry.fileContext ?? 'survey',
        }) + '/edited.jpg'
      fileResolutions.push({
        manifestEntry: entry,
        existingFileId: null,
        newFileId: DatacapyId(),
        newFilePath,
        imageSetId: newImageSetId,
        imageVariant: 'edited',
        resurrect: false,
      })
    }

    // Pass 2: original and thumb variants
    for (const entry of (bundle.embeddedFileEntries ?? []).filter(
      (e) => e.imageVariant !== 'edited',
    )) {
      const resolvedSetId = imageSetIdMap[entry.imageSetId]
      if (!resolvedSetId) continue
      if (dedupedSets.has(resolvedSetId)) continue

      const newFilePath =
        generateImageSetBasePath(resolvedSetId, {
          projectId,
          surveyId,
          fileContext: entry.fileContext ?? 'survey',
        }) +
        '/' +
        entry.imageVariant +
        '.jpg'
      fileResolutions.push({
        manifestEntry: entry,
        existingFileId: null,
        newFileId: DatacapyId(),
        newFilePath,
        imageSetId: resolvedSetId,
        imageVariant: entry.imageVariant,
        resurrect: false,
      })
    }

    return { fileResolutions, imageSetIdMap }
  }
}

/**
 * Re-key the entity-ID-keyed maps within a SurveyLanguageData object using the
 * provided ID translation map. Handles groups, questions, subquestions, and
 * answerOptions maps. Survey-level scalar fields are passed through unchanged.
 */
function translateLanguageTextKeys(
  text: SurveyLanguageData,
  idMap: Map<string, string>,
): SurveyLanguageData {
  if (!text || !idMap.size) return text

  const result: SurveyLanguageData = { ...text }

  const remapMap = <T>(
    map: Record<string, T> | undefined,
  ): Record<string, T> | undefined => {
    if (!map) return map
    const remapped: Record<string, T> = {}
    for (const [id, value] of Object.entries(map)) {
      remapped[idMap.get(id) ?? id] = value
    }
    return remapped
  }

  if (result.sections) result.sections = remapMap(result.sections)
  if (result.elements) result.elements = remapMap(result.elements)
  if (result.subquestions) result.subquestions = remapMap(result.subquestions)
  if (result.answerOptions)
    result.answerOptions = remapMap(result.answerOptions)

  return result
}
