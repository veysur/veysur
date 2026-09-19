import {
  Survey,
  SurveySection,
  SurveyElementBase,
  isSurveyQuestion,
  isSurveyContent,
} from 'veysur-common'

/**
 * The `survey.json` payload shared by the `.vsst` and `.vssa` export paths.
 *
 * Wire format version `2.0`: section/element vocabulary, one `elements` array
 * discriminated by `kind` (`'content'` for content elements, otherwise a
 * question). Welcome / thank-you sections export as ordinary `sections` rows
 * carrying their `kind`.
 */
export const STRUCTURAL_SURVEY_JSON_VERSION = '2.0'

export function buildStructuralSurveyJson(survey: Survey) {
  const ordered = survey.applySortOrder()

  return {
    version: STRUCTURAL_SURVEY_JSON_VERSION,
    survey: {
      _id: ordered._id,
      name: ordered.name,
      title: ordered.title,
      language: ordered.language,
      presentation: ordered.presentation,
      participant: ordered.participant,
      data: ordered.data,
      access: ordered.access,
      dataPolicy: ordered.dataPolicy,
      legalNotice: ordered.legalNotice,
      schedule: ordered.schedule,
      notify: ordered.notify,
      sectionIds: ordered.sectionIds,
      elementIds: ordered.elementIds,
      attributes: ordered.attributes,
    },
    sections: Array.from(ordered.sections ?? []).map(
      (section: SurveySection) => ({
        _id: section._id,
        surveyId: section.surveyId,
        code: section.code,
        kind: section.kind,
        name: section.name,
        desc: section.desc,
        config: section.config,
        condition: section.condition,
        attributes: section.attributes,
      }),
    ),
    elements: Array.from(ordered.elements ?? []).map(
      (element: SurveyElementBase) => {
        const common = {
          _id: element._id,
          surveyId: element.surveyId,
          sectionId: element.sectionId,
          type: element.type,
          code: element.code,
          text: element.text,
          condition: element.condition,
          attributes: element.attributes,
        }
        if (isSurveyQuestion(element)) {
          return {
            ...common,
            kind: 'question',
            detail: element.detail,
            subquestions: element.subquestions
              ? Array.from(element.subquestions)
              : [],
            answerOptions: element.answerOptions
              ? Array.from(element.answerOptions)
              : [],
          }
        }
        return {
          ...common,
          kind: 'content',
          config: isSurveyContent(element) ? element.config : null,
        }
      },
    ),
  }
}
