import type { Survey } from '../model/constructor/Survey'
import { isSurveyQuestion } from '../model/constructor/Survey/SurveyQuestion'
import { QUESTION_TYPE_FILE_UPLOAD } from '../model/constructor/Survey/attributeMeta/types'

// An upload needs the participant token inside the same handler that starts it,
// which deferred embed authentication cannot provide.
export function surveyHasFileUpload(survey: Survey): boolean {
  return Array.from(survey.elements).some(
    (element) =>
      isSurveyQuestion(element) && element.type === QUESTION_TYPE_FILE_UPLOAD,
  )
}
