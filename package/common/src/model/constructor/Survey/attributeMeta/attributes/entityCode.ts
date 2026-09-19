import { ENTITY_CODE_PATTERN } from 'model/schema/constant'

import { Survey, SurveyEntity } from '../../../Survey'
import { isSurveyQuestion } from '../../SurveyQuestion'
import { isSurveyContent } from '../../SurveyContent'
import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_CONTENT,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from '../types'
import { ATTRIBUTE_ENTITY_CODE } from '../constants'
import { getReservedEntityCodes } from '../reservedEntityCodes'
import { getNestedValue } from '../helpers'

// Subquestion/answer-option codes only need to be unique among their own
// siblings within the owning question, not across the whole survey.
function getSiblingCodes(entity: SurveyEntity, survey: Survey): string[] {
  const elements = Array.from(survey.elements ?? [])
  const questions = elements.filter(isSurveyQuestion)
  const contents = elements.filter(isSurveyContent)
  const sections = Array.from(survey.sections ?? [])

  const parentQuestion = questions.find(
    (question) =>
      question.subquestions?.some((sq) => sq._id === entity._id) ||
      question.answerOptions?.some((ao) => ao._id === entity._id),
  )

  if (parentQuestion?.subquestions?.some((sq) => sq._id === entity._id)) {
    return parentQuestion.subquestions
      .filter((sq) => sq._id !== entity._id)
      .map((sq) => sq.code)
  }

  if (parentQuestion?.answerOptions?.some((ao) => ao._id === entity._id)) {
    return parentQuestion.answerOptions
      .filter((ao) => ao._id !== entity._id)
      .map((ao) => ao.code)
  }

  return [
    ...questions.filter((q) => q._id !== entity._id).map((q) => q.code),
    ...contents.filter((c) => c._id !== entity._id).map((c) => c.code),
    ...sections.filter((g) => g._id !== entity._id).map((g) => g.code),
  ]
}

export const entityCodeMeta: AttributeMeta = {
  id: ATTRIBUTE_ENTITY_CODE,
  entityTypes: [
    SURVEY_ENTITY_TYPE_SECTION,
    SURVEY_ENTITY_TYPE_ELEMENT,
    SURVEY_ENTITY_TYPE_CONTENT,
    SURVEY_ENTITY_TYPE_ANSWER_OPTION,
    SURVEY_ENTITY_TYPE_SUBQUESTION,
  ],
  name: 'Code',
  description: 'Unique identifier code',
  typesLimit: [],
  initialValue: '',
  isEntityProp: true,
  getSchemaSpec: (entity, survey) => ({
    $type: String,
    $name: 'Code',
    $validate: {
      required: true,
      notEmpty: {
        message: 'Code is required',
      },
      regex: [
        {
          pattern: ENTITY_CODE_PATTERN,
          message:
            'Must start with a letter and contain only letters, numbers, and underscores',
        },
      ],
      callback: {
        validator: function (value: string) {
          if (getReservedEntityCodes().includes(value.toUpperCase())) {
            return `"Reserved code`
          }
          const existingCodes = getSiblingCodes(entity, survey)
          return existingCodes.includes(value) ? 'Duplicate code' : true
        },
      },
    },
  }),
  getValue: (entity) => {
    return getNestedValue(entity, ATTRIBUTE_ENTITY_CODE)
  },
}
