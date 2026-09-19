import { ValidationError } from './SurveyImportValidator'
import { ImportSurveyData } from './ImportSurveyData'

/**
 * Repair action details
 */
export interface RepairAction {
  entityType: string
  entityId: string
  action: 'fix' | 'discard'
  field?: string
  oldValue?: unknown
  newValue?: unknown
  reason: string
}

/**
 * Repair result
 */
export interface RepairResult {
  data: ImportSurveyData
  repairs: RepairAction[]
  discards: RepairAction[]
}

/**
 * Survey Import Repairer
 *
 * Repairs or discards invalid data in force mode:
 * - Repairable: Invalid surveyId, invalid sectionId, invalid elementIds
 * - Unrepairable: Unrecognized question type
 */
export class SurveyImportRepairer {
  /**
   * Repair import data based on validation errors
   *
   * @param importData - Data to repair
   * @param errors - Validation errors
   * @returns Repaired data with lists of repairs and discards
   */
  repair(
    importData: ImportSurveyData,
    errors: ValidationError[],
  ): RepairResult {
    const repairs: RepairAction[] = []
    const discards: RepairAction[] = []

    // Deep clone to avoid mutations
    const data: ImportSurveyData = JSON.parse(JSON.stringify(importData))

    // Separate errors by repairability
    const repairableErrors = errors.filter((e) => e.repairable)
    const unrepairableErrors = errors.filter((e) => !e.repairable)

    // Get last section for fallback
    const lastSection = data.sections[data.sections.length - 1]
    const surveyId = data.survey._id

    // 1. Handle repairable errors
    for (const error of repairableErrors) {
      if (error.type === 'reference' && error.entityType === 'section') {
        if (error.field === 'surveyId') {
          // Fix section with invalid surveyId
          const section = data.sections.find((s) => s._id === error.entityId)
          if (section) {
            repairs.push({
              entityType: 'section',
              entityId: error.entityId,
              action: 'fix',
              field: 'surveyId',
              oldValue: section.surveyId,
              newValue: surveyId,
              reason: 'Fixed surveyId to match imported survey',
            })
            section.surveyId = surveyId
          }
        } else if (error.field === 'elementIds') {
          // Remove invalid element reference from section
          const section = data.sections.find((s) => s._id === error.entityId)
          if (section && Array.isArray(section.elementIds)) {
            const invalidEid = error.details?.invalidElementId
            const oldValue = [...section.elementIds]
            section.elementIds = section.elementIds.filter(
              (eid: string) => eid !== invalidEid,
            )

            repairs.push({
              entityType: 'section',
              entityId: error.entityId,
              action: 'fix',
              field: 'elementIds',
              oldValue,
              newValue: section.elementIds,
              reason: `Removed invalid element reference: ${invalidEid}`,
            })
          }
        }
      } else if (error.type === 'reference' && error.entityType === 'element') {
        if (error.field === 'surveyId') {
          // Fix element with invalid surveyId
          const element = data.elements.find((e) => e._id === error.entityId)
          if (element) {
            repairs.push({
              entityType: 'element',
              entityId: error.entityId,
              action: 'fix',
              field: 'surveyId',
              oldValue: element.surveyId,
              newValue: surveyId,
              reason: 'Fixed surveyId to match imported survey',
            })
            element.surveyId = surveyId
          }
        } else if (error.field === 'sectionId' && lastSection) {
          // Fix element with invalid sectionId by assigning to last section
          const element = data.elements.find((e) => e._id === error.entityId)
          if (element) {
            repairs.push({
              entityType: 'element',
              entityId: error.entityId,
              action: 'fix',
              field: 'sectionId',
              oldValue: element.sectionId,
              newValue: lastSection._id,
              reason: 'Fixed invalid sectionId by assigning to last section',
            })
            element.sectionId = lastSection._id

            // Add element to last section's elementIds if not already there
            if (
              Array.isArray(lastSection.elementIds) &&
              !lastSection.elementIds.includes(element._id)
            ) {
              lastSection.elementIds.push(element._id)
            }
          }
        }
      } else if (error.type === 'reference' && error.entityType === 'survey') {
        if (error.field === 'sectionIds') {
          // Remove invalid section reference from survey
          const invalidSid = error.details?.invalidSectionId
          const oldValue = [...data.survey.sectionIds]
          data.survey.sectionIds = data.survey.sectionIds.filter(
            (sid: string) => sid !== invalidSid,
          )

          repairs.push({
            entityType: 'survey',
            entityId: surveyId,
            action: 'fix',
            field: 'sectionIds',
            oldValue,
            newValue: data.survey.sectionIds,
            reason: `Removed invalid section reference: ${invalidSid}`,
          })
        } else if (error.field === 'elementIds') {
          // Remove invalid element reference from survey
          const invalidEid = error.details?.invalidElementId
          const oldValue = [...data.survey.elementIds]
          data.survey.elementIds = data.survey.elementIds.filter(
            (eid: string) => eid !== invalidEid,
          )

          repairs.push({
            entityType: 'survey',
            entityId: surveyId,
            action: 'fix',
            field: 'elementIds',
            oldValue,
            newValue: data.survey.elementIds,
            reason: `Removed invalid element reference: ${invalidEid}`,
          })
        }
      }
    }

    // 2. Handle unrepairable errors (discard)
    for (const error of unrepairableErrors) {
      if (error.type === 'elementType') {
        // Discard element with invalid type
        const elementIndex = data.elements.findIndex(
          (e) => e._id === error.entityId,
        )

        if (elementIndex >= 0) {
          const element = data.elements[elementIndex]

          discards.push({
            entityType: 'element',
            entityId: error.entityId,
            action: 'discard',
            reason: `Discarded question with unrecognized type: ${element.type}`,
          })

          // Remove from elements array
          data.elements.splice(elementIndex, 1)

          // Remove from section's elementIds
          for (const section of data.sections) {
            if (Array.isArray(section.elementIds)) {
              section.elementIds = section.elementIds.filter(
                (eid: string) => eid !== element._id,
              )
            }
          }

          // Remove from survey's elementIds
          if (Array.isArray(data.survey.elementIds)) {
            data.survey.elementIds = data.survey.elementIds.filter(
              (eid: string) => eid !== element._id,
            )
          }
        }
      }
    }

    return {
      data,
      repairs,
      discards,
    }
  }
}
