import { ObjectPathAccessor } from 'mzen-schema'

import {
  Survey,
  SurveySection,
  SurveyQuestion,
  SurveyContent,
} from 'model/constructor'

import {
  Patch,
  PatchType,
  BUFFERED_PATCH_ACTION_CREATE,
  BUFFERED_PATCH_ACTION_UPDATE,
  BUFFERED_PATCH_ACTION_DELETE,
} from './Patcher'

function isPlainObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Merge plain objects (e.g. L10n fields) at the top level rather than replacing them,
// so that patches carrying only a subset of languages don't discard other languages.
function applyPatchData<T extends object>(
  data: Record<string, unknown>,
  entity: T,
): void {
  for (const path in data) {
    const newValue = data[path]
    const entityValue = (entity as Record<string, unknown>)[path]
    if (
      !path.includes('.') &&
      isPlainObject(newValue) &&
      isPlainObject(entityValue)
    ) {
      Object.assign(entityValue as object, newValue)
    } else {
      ObjectPathAccessor.setPath(path, newValue, entity)
    }
  }
}

export const BUFFERED_PATCH_TYPE_SURVEY: PatchType = 'survey'
/** Section patches also carry `welcome`/`thankYou` sections, not just groups. */
export const BUFFERED_PATCH_TYPE_SECTION: PatchType = 'section'
export const BUFFERED_PATCH_TYPE_ELEMENT: PatchType = 'element'
export const BUFFERED_PATCH_TYPE_ANSWER_OPTION: PatchType = 'answerOption'
export const BUFFERED_PATCH_TYPE_SUBQUESTION: PatchType = 'subquestion'
export const BUFFERED_PATCH_TYPE_CONTENT: PatchType = 'content'

// Ensure view does not revert back to previous state when receiving survey data from the server
//
// While sending the patch buffer to the server new patches can still be added to the buffer
// The local survey data can refresh at any time, usually immediately after pushing the patch
// buffer to the server. The survey data returned from the server will not include the patches
// that we added to the buffer before we sent the last patch to the server. We must apply these
// patches to the newel received survey data to ensure the local view does not revert back to
// the previous status.
export class PatchApplierSurvey {
  static applyPatches(patches: Patch[], survey: Survey): Survey {
    try {
      patches.forEach((patch) => {
        survey = this.applyPatch(patch, survey)
      })
    } catch (error) {
      console.error('Error applying patches', error)
    }
    return survey.applySortOrder()
  }

  private static applyPatch(patch: Patch, survey: Survey): Survey {
    switch (patch.type) {
      case BUFFERED_PATCH_TYPE_SURVEY:
        return this.applySurveyPatch(patch, survey)
      case BUFFERED_PATCH_TYPE_SECTION:
        return this.applySectionPatch(patch, survey)
      case BUFFERED_PATCH_TYPE_ELEMENT:
        return this.applyElementPatch(patch, survey)
      case BUFFERED_PATCH_TYPE_ANSWER_OPTION:
        return this.applyAnswerOptionPatch(patch, survey)
      case BUFFERED_PATCH_TYPE_SUBQUESTION:
        return this.applySubquestionPatch(patch, survey)
      case BUFFERED_PATCH_TYPE_CONTENT:
        return this.applyContentPatch(patch, survey)
      default:
        console.warn(`Unsupported patch type: ${patch.type}`)
        return survey
    }
  }

  private static applySurveyPatch(patch: Patch, survey: Survey): Survey {
    switch (patch.action) {
      case BUFFERED_PATCH_ACTION_UPDATE:
        return survey.update(patch.data as Partial<Survey>)
      default:
        console.warn(`Unsupported action for survey patch: ${patch.action}`)
        return survey
    }
  }

  private static applySectionPatch(patch: Patch, survey: Survey): Survey {
    if (patch.id !== undefined && typeof patch.id !== 'string') {
      console.warn(`Invalid section id: "${patch.id}"`)
      return survey
    }
    const patchId = patch.id as string | undefined
    switch (patch.action) {
      case BUFFERED_PATCH_ACTION_CREATE:
        if (
          patch.data !== null &&
          patch.action === BUFFERED_PATCH_ACTION_CREATE
        ) {
          if (!survey.sections.getById(patchId)) {
            survey = survey.addSection(patch.data as Partial<SurveySection>)
          }
        }
        break
      case BUFFERED_PATCH_ACTION_UPDATE:
        if (patch.id) {
          const group = survey.sections.getById(patchId)
          if (group) {
            applyPatchData(patch.data ?? {}, group)
            survey = survey.updateSection(patchId, { ...group })
          }
        }
        break
      case BUFFERED_PATCH_ACTION_DELETE:
        if (patch.id) {
          survey = survey.deleteSection(patchId)
        }
        break
      default:
        console.warn(`Unsupported action for section patch: ${patch.action}`)
        break
    }
    return survey
  }

  private static applyContentPatch(patch: Patch, survey: Survey): Survey {
    if (patch.id !== undefined && typeof patch.id !== 'string') {
      console.warn(`Invalid content element id: "${patch.id}"`)
      return survey
    }
    const patchId = patch.id as string | undefined
    switch (patch.action) {
      case BUFFERED_PATCH_ACTION_CREATE:
        if (patch.data !== null && !survey.elements.getById(patchId)) {
          const data = patch.data as Partial<SurveyContent> & {
            sectionId?: string
          }
          survey = survey.addContent(data.sectionId as string, data)
        }
        break
      case BUFFERED_PATCH_ACTION_UPDATE:
        if (patch.id) {
          const element = survey.elements.getById(patchId)
          if (element) {
            applyPatchData(patch.data ?? {}, element)
            survey = survey.updateContent(patchId, {
              ...(element as unknown as Partial<SurveyContent>),
            })
          }
        }
        break
      case BUFFERED_PATCH_ACTION_DELETE:
        if (patch.id) {
          survey = survey.deleteContent(patchId)
        }
        break
      default:
        console.warn(
          `Unsupported action for content element patch: ${patch.action}`,
        )
        break
    }
    return survey
  }

  private static applyAnswerOptionPatch(patch: Patch, survey: Survey): Survey {
    if (patch.action !== BUFFERED_PATCH_ACTION_UPDATE || !patch.id)
      return survey
    const answerId = patch.id as string
    let questionId: string | undefined
    for (const question of survey.elements.questionList()) {
      if (question.answerOptions?.some((ao) => ao._id === answerId)) {
        questionId = question._id
        break
      }
    }
    if (!questionId) return survey
    const question = survey.elements.getQuestionById(questionId)
    if (!question) return survey
    const answerOption = question.answerOptions?.find(
      (ao) => ao._id === answerId,
    )
    if (!answerOption) return survey
    applyPatchData(patch.data ?? {}, answerOption)
    return survey.updateQuestion(questionId, { ...question })
  }

  private static applySubquestionPatch(patch: Patch, survey: Survey): Survey {
    if (patch.action !== BUFFERED_PATCH_ACTION_UPDATE || !patch.id)
      return survey
    const subquestionId = patch.id as string
    let questionId: string | undefined
    for (const question of survey.elements.questionList()) {
      if (question.subquestions?.getById(subquestionId)) {
        questionId = question._id
        break
      }
    }
    if (!questionId) return survey
    const question = survey.elements.getQuestionById(questionId)
    if (!question) return survey
    const subquestion = question.subquestions?.getById(subquestionId)
    if (!subquestion) return survey
    applyPatchData(patch.data ?? {}, subquestion)
    return survey.updateQuestion(questionId, { ...question })
  }

  private static applyElementPatch(patch: Patch, survey: Survey): Survey {
    if (patch.id !== undefined && typeof patch.id !== 'string') {
      console.warn(`Invalid element id: "${patch.id}"`)
      return survey
    }
    const patchId = patch.id as string | undefined
    switch (patch.action) {
      case BUFFERED_PATCH_ACTION_CREATE:
        if (
          patch.data !== null &&
          patch.action === BUFFERED_PATCH_ACTION_CREATE
        ) {
          if (!survey.elements.getById(patchId)) {
            survey = survey.addQuestion(
              patch.data.sectionId as string,
              patch.data as Partial<SurveyQuestion>,
            )
          }
        }
        break
      case BUFFERED_PATCH_ACTION_UPDATE:
        if (patch.id) {
          const question = survey.elements.getQuestionById(patchId)
          if (question) {
            applyPatchData(patch.data ?? {}, question)
            survey = survey.updateQuestion(patchId, { ...question })
          }
        }
        break
      case BUFFERED_PATCH_ACTION_DELETE:
        if (patch.id) {
          survey = survey.deleteQuestion(patchId)
        }
        break
      default:
        console.warn(`Unsupported action for element patch: ${patch.action}`)
        break
    }
    return survey
  }
}
