import { genUniqueId } from '@datacapy/id'

import { ImportSurveyData } from './ImportSurveyData'

/**
 * ID mapping for translation
 */
export interface IdMapping {
  originalId: string
  newId: string
  entityType: 'survey' | 'section' | 'element'
}

/**
 * Result of ID translation
 */
export interface IdTranslationResult {
  data: ImportSurveyData
  translations: IdMapping[]
}

interface ImportRepo {
  findOne: (
    query: Record<string, unknown>,
    options: { context?: unknown },
  ) => Promise<unknown>
}

/**
 * Survey Import ID Translator
 *
 * Handles ID collision detection and translation when importing surveys.
 * Generates new IDs for entities that already exist and updates all references.
 */
export class SurveyImportIdTranslator {
  private surveyRepo: ImportRepo
  private sectionRepo?: ImportRepo
  private elementRepo?: ImportRepo

  constructor(repos: {
    surveyRepo: ImportRepo
    sectionRepo?: ImportRepo
    elementRepo?: ImportRepo
  }) {
    this.surveyRepo = repos.surveyRepo
    this.sectionRepo = repos.sectionRepo
    this.elementRepo = repos.elementRepo
  }

  /**
   * Translate IDs in import data to avoid collisions
   *
   * @param importData - Parsed import data
   * @param context - Optional datasource context (required for dynamic/multi-tenant repos)
   * @returns Translated data and list of translations made
   */
  async translate(
    importData: ImportSurveyData,
    context?: unknown,
  ): Promise<IdTranslationResult> {
    const translations: IdMapping[] = []
    const idMap = new Map<string, string>()
    const queryOptions = context ? { context } : {}

    // Deep clone data to avoid mutations
    let data = JSON.parse(JSON.stringify(importData))

    // 1. Check survey ID collision
    const surveyId = data.survey._id
    const surveyExists = await this.surveyRepo.findOne(
      { _id: surveyId },
      queryOptions,
    )

    if (surveyExists) {
      const newSurveyId = genUniqueId()
      idMap.set(surveyId, newSurveyId)
      translations.push({
        originalId: surveyId,
        newId: newSurveyId,
        entityType: 'survey',
      })
    }

    // 2. Check section ID collisions (if section repo available)
    if (this.sectionRepo) {
      for (const section of data.sections) {
        const sectionExists = await this.sectionRepo.findOne(
          { _id: section._id },
          queryOptions,
        )

        if (sectionExists) {
          const newSectionId = genUniqueId()
          idMap.set(section._id, newSectionId)
          translations.push({
            originalId: section._id,
            newId: newSectionId,
            entityType: 'section',
          })
        }
      }
    }

    // 3. Check element ID collisions (if element repo available)
    if (this.elementRepo) {
      for (const element of data.elements) {
        const elementExists = await this.elementRepo.findOne(
          { _id: element._id },
          queryOptions,
        )

        if (elementExists) {
          const newElementId = genUniqueId()
          idMap.set(element._id, newElementId)
          translations.push({
            originalId: element._id,
            newId: newElementId,
            entityType: 'element',
          })
        }
      }
    }

    // 4. Apply translations throughout data structure
    data = this.applyTranslations(data, idMap)

    return {
      data,
      translations,
    }
  }

  /**
   * Apply ID translations throughout data structure
   */
  private applyTranslations(
    data: ImportSurveyData,
    idMap: Map<string, string>,
  ): ImportSurveyData {
    const getTranslatedId = (id: string) => idMap.get(id) || id

    // Translate survey
    const surveyId = getTranslatedId(data.survey._id)
    data.survey._id = surveyId
    data.survey.surveyId = surveyId // In case it exists

    // Update survey's sectionIds and elementIds
    if (data.survey.sectionIds) {
      data.survey.sectionIds = data.survey.sectionIds.map((id: string) =>
        getTranslatedId(id),
      )
    }
    if (data.survey.elementIds) {
      data.survey.elementIds = data.survey.elementIds.map((id: string) =>
        getTranslatedId(id),
      )
    }

    // Translate sections
    data.sections = data.sections.map((section) => {
      const sectionId = getTranslatedId(section._id)

      return {
        ...section,
        _id: sectionId,
        surveyId,
        elementIds: section.elementIds
          ? section.elementIds.map((id: string) => getTranslatedId(id))
          : [],
      }
    })

    // Translate elements
    data.elements = data.elements.map((element) => {
      const elementId = getTranslatedId(element._id)
      const sectionId = element.sectionId
        ? getTranslatedId(element.sectionId)
        : element.sectionId

      return {
        ...element,
        _id: elementId,
        surveyId,
        sectionId,
        // Translate subquestion IDs if present
        subquestions: element.subquestions
          ? element.subquestions.map((sq) => ({
              ...sq,
              _id: sq._id ? getTranslatedId(sq._id) : sq._id,
              questionId: elementId,
              surveyId,
            }))
          : [],
        // Translate answer option IDs if present
        answerOptions: element.answerOptions
          ? element.answerOptions.map((ao) => ({
              ...ao,
              _id: ao._id ? getTranslatedId(ao._id) : ao._id,
              questionId: elementId,
              surveyId,
            }))
          : [],
      }
    })

    return data
  }
}
