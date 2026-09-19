import { Schema } from 'mzen-schema'

import {
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_RANKING,
  SurveyAttributes,
} from '../constructor/Survey/attributeMeta/types'
import {
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
} from '../constructor/Survey/attributeMeta/constants'
import {
  isMatrixQuestionType,
  hasAnyMatrixCellFilled,
  getMatrixCellType,
} from '../constructor/Survey/Matrix'
import {
  isMultiPartQuestionType,
  hasAnyMultiPartFilled,
} from '../constructor/Survey/MultiPart'
import { ConditionEvaluator } from './SurveyCondition/ConditionEvaluator'
import { ExpressionContextBuilder } from './SurveyExpression/ExpressionContext'
import { ParticipantData } from './SurveyExpression/types'
import { QuestionInfo } from './SurveyCondition/types'
import {
  buildAnswerOptionCodesForQuestion,
  getChoiceOtherValue,
} from './SurveyCondition/predefinedAnswerOptions'

const CHOICE_TYPES_BOOLEAN = new Set([QUESTION_TYPE_YES_NO])
const CHOICE_TYPES_NUMBER = new Set([
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
])
const CHOICE_TYPES_WITH_OPTIONS = new Set([
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
])
const CHOICE_TYPES_RANKING = new Set([QUESTION_TYPE_RANKING])

type ValidatableEntity = { type: string; attributes?: SurveyAttributes }

type ValidatableSubquestion = {
  code: string
  type: string
  text?: unknown
  attributes?: SurveyAttributes
}

export type ValidatableSection = {
  _id: string
  condition?: string | null
}

export type ValidatableQuestion = {
  code: string
  type: string
  condition?: string | null
  sectionId?: string
  attributes?: SurveyAttributes
  subquestions?: Iterable<ValidatableSubquestion>
  answerOptions?: Iterable<{ code: string }>
}

export interface SurveyResponseValidateOptions {
  sections?: ValidatableSection[]
  participantData?: ParticipantData
  /** The language the response is being given in - see `response.language`
   * in ExpressionContextBuilder.build */
  language?: string | null
  /** The survey's own default language, used as a fallback when a subquestion
   * has no text in `language` - see `survey.language.default` */
  defaultLanguage?: string | null
}

export type ValidationMessage = {
  key: string
  params?: Record<string, unknown>
}

export interface SurveyResponseValidationResult {
  isValid: boolean
  errors: { [questionCode: string]: ValidationMessage[] }
}

// choiceMinMax/numberMinMax use 0 to mean "no constraint" on that bound.
function buildCountLimitError(
  keyPrefix: string,
  min: number,
  max: number,
  extraParams: Record<string, unknown> = {},
): ValidationMessage {
  if (min > 0 && max > 0) {
    return { key: `${keyPrefix}_between`, params: { ...extraParams, min, max } }
  }
  // `count` drives i18next's _one/_other plural selection on the atLeast/atMost keys.
  if (min > 0) {
    return {
      key: `${keyPrefix}_atLeast`,
      params: { ...extraParams, min, count: min },
    }
  }
  return {
    key: `${keyPrefix}_atMost`,
    params: { ...extraParams, max, count: max },
  }
}

type EntityCallbackValidator = {
  validator: (value: unknown) => true | ValidationMessage
}

export function buildEntityValidateConfig(
  entity: ValidatableEntity,
): Record<string, unknown> {
  let validate: Record<string, unknown> = {}
  const callbacks: EntityCallbackValidator[] = []

  if (
    Boolean(entity.attributes?.required) &&
    !isMatrixQuestionType(entity.type) &&
    !isMultiPartQuestionType(entity.type)
  ) {
    // `required` catches an undefined answer, `notEmpty` catches an empty
    // string — both builtin validators accept a non-string `message`, which
    // is returned verbatim as the error entry, so a ValidationMessage object
    // flows straight through instead of the builtin's own English text.
    validate = {
      ...validate,
      required: { message: { key: 'validation.required' } },
      notEmpty: {
        permissive: true,
        message: { key: 'validation.required' },
      },
    }
  }
  if (
    Boolean(entity.attributes?.choiceMinMax) &&
    CHOICE_TYPES_WITH_OPTIONS.has(entity.type)
  ) {
    const { min, max } = entity.attributes!.choiceMinMax
    callbacks.push({
      validator: (value: unknown) => {
        const count =
          value && typeof value === 'object' && !Array.isArray(value)
            ? Object.keys(value).filter(
                (k) =>
                  k !== CHOICE_OTHER_VALUE_KEY &&
                  (value as Record<string, unknown>)[k],
              ).length
            : 0
        if (min > 0 && count < min) {
          return buildCountLimitError('validation.choiceCount', min, max)
        }
        if (max > 0 && count > max) {
          return buildCountLimitError('validation.choiceCount', min, max)
        }
        return true
      },
    })
  }
  if (
    Boolean(entity.attributes?.choiceMinMax) &&
    CHOICE_TYPES_RANKING.has(entity.type)
  ) {
    const { min, max } = entity.attributes!.choiceMinMax
    callbacks.push({
      validator: (value: unknown) => {
        const order =
          value &&
          typeof value === 'object' &&
          Array.isArray((value as Record<string, unknown>).ORDER)
            ? ((value as Record<string, unknown>).ORDER as unknown[])
            : []
        const count = order.length
        if (min > 0 && count < min) {
          return buildCountLimitError('validation.rankCount', min, max)
        }
        if (max > 0 && count > max) {
          return buildCountLimitError('validation.rankCount', min, max)
        }
        return true
      },
    })
  }
  if (entity.attributes?.lengthMinMax) {
    const { min, max } = entity.attributes.lengthMinMax
    callbacks.push({
      validator: (value: unknown) => {
        const length = typeof value === 'string' ? value.length : 0
        if (min > 0 && length < min) {
          return buildCountLimitError('validation.length', min, max)
        }
        if (max > 0 && length > max) {
          return buildCountLimitError('validation.length', min, max)
        }
        return true
      },
    })
  }

  return callbacks.length > 0 ? { ...validate, callback: callbacks } : validate
}

function getValidationType(
  question: ValidatableEntity,
): typeof Boolean | typeof Number | typeof Object | typeof String {
  if (CHOICE_TYPES_BOOLEAN.has(question.type)) return Boolean
  if (CHOICE_TYPES_NUMBER.has(question.type)) return Number
  if (CHOICE_TYPES_WITH_OPTIONS.has(question.type)) return Object
  if (CHOICE_TYPES_RANKING.has(question.type)) return Object
  if (isMatrixQuestionType(question.type)) return Object
  if (isMultiPartQuestionType(question.type)) return Object
  if (question.type === QUESTION_TYPE_NUMBER) return Number
  return String
}

function getMultiPartPartValidationType(
  partType: string,
): typeof Boolean | typeof Number | typeof String {
  if (CHOICE_TYPES_BOOLEAN.has(partType)) return Boolean
  if (CHOICE_TYPES_NUMBER.has(partType)) return Number
  if (partType === QUESTION_TYPE_NUMBER) return Number
  return String
}

function getMatrixCellValidationType(
  subquestionType: string,
): typeof Boolean | typeof Number | typeof String {
  switch (getMatrixCellType(subquestionType)) {
    case 'boolean':
      return Boolean
    case 'number':
      return Number
    default:
      return String
  }
}

function getSubquestionLabel(
  text: unknown,
  code: string,
  language: string,
  defaultLanguage: string,
): string {
  if (text && typeof (text as { getLang?: unknown }).getLang === 'function') {
    return (
      (
        text as { getLang: (lang: string, defaultLang: string) => string }
      ).getLang(language, defaultLanguage) ||
      code ||
      'Column'
    )
  }
  if (text && typeof text === 'object') {
    const l10n = text as Record<string, string>
    return l10n[language] || l10n[defaultLanguage] || code || 'Column'
  }
  return code || 'Column'
}

export class SurveyResponseValidator {
  async validate(
    questions: ValidatableQuestion[],
    answers: Record<string, unknown>,
    options: SurveyResponseValidateOptions = {},
  ): Promise<SurveyResponseValidationResult> {
    const visibleQuestions = this.filterVisibleQuestions(
      questions,
      answers,
      options,
    )
    const language = options.language || options.defaultLanguage || 'en'
    const defaultLanguage = options.defaultLanguage || 'en'
    const errors: Record<string, ValidationMessage[]> = {}

    for (const question of visibleQuestions) {
      const questionErrors: ValidationMessage[] = []

      // Schema-based: required, choiceMinMax, lengthMinMax
      const validateConfig = buildEntityValidateConfig(question)
      if (Object.keys(validateConfig).length > 0) {
        const schema = new Schema({
          [question.code]: {
            $type: getValidationType(question),
            $label: 'This question',
            $validate: validateConfig,
            $filter: {},
          },
        })
        const { isValid: schemaValid, errors: schemaErrors } =
          await schema.validate({ [question.code]: answers[question.code] })
        const questionCodeErrors = schemaErrors?.[
          question.code
        ] as unknown as ValidationMessage[]
        if (!schemaValid && Array.isArray(questionCodeErrors)) {
          questionErrors.push(...questionCodeErrors)
        }
      }

      const value = answers[question.code]

      // Direct: required "Other" option must include a specified value
      if (
        Boolean(question.attributes?.required) &&
        Boolean(question.attributes?.choiceOther) &&
        CHOICE_TYPES_WITH_OPTIONS.has(question.type)
      ) {
        const isObjectValue =
          value && typeof value === 'object' && !Array.isArray(value)
        const otherSelected =
          isObjectValue &&
          Boolean((value as Record<string, unknown>)[CHOICE_OTHER_CODE])
        if (otherSelected) {
          const otherValue = (value as Record<string, unknown>)[
            CHOICE_OTHER_VALUE_KEY
          ]
          if (typeof otherValue !== 'string' || otherValue.trim() === '') {
            questionErrors.push({ key: 'validation.otherRequired' })
          }
        }
      }

      // Direct: numberMinMax
      if (
        question.attributes?.numberMinMax &&
        question.type === QUESTION_TYPE_NUMBER
      ) {
        const { min, max } = question.attributes.numberMinMax
        const num = Number(value)
        if (max > 0 && (num < min || num > max)) {
          questionErrors.push({
            key: 'validation.numberRange',
            params: { min, max },
          })
        }
      }

      // Direct: numberNegAllowed
      if (
        question.attributes?.numberNegAllowed === false &&
        question.type === QUESTION_TYPE_NUMBER
      ) {
        const num = Number(value)
        if (!isNaN(num) && num < 0) {
          questionErrors.push({ key: 'validation.numberNegative' })
        }
      }

      // Matrix question-level required: at least one cell must be filled
      if (
        isMatrixQuestionType(question.type) &&
        Boolean(question.attributes?.required) &&
        !hasAnyMatrixCellFilled(value)
      ) {
        questionErrors.push({ key: 'validation.required' })
      }

      // Matrix subquestion validation
      if (isMatrixQuestionType(question.type)) {
        const matrixErrors = await this.validateMatrixSubquestions(
          question,
          value,
          language,
          defaultLanguage,
        )
        questionErrors.push(...matrixErrors)
      }

      // Multi-Part question-level required: at least one part must be filled
      if (
        isMultiPartQuestionType(question.type) &&
        Boolean(question.attributes?.required) &&
        !hasAnyMultiPartFilled(value)
      ) {
        questionErrors.push({ key: 'validation.required' })
      }

      // Multi-Part subquestion (part) validation
      if (isMultiPartQuestionType(question.type)) {
        const multiPartErrors = await this.validateMultiPartSubquestions(
          question,
          value,
          language,
          defaultLanguage,
        )
        questionErrors.push(...multiPartErrors)
      }

      if (questionErrors.length > 0) {
        errors[question.code] = questionErrors
      }
    }

    return { isValid: Object.keys(errors).length === 0, errors }
  }

  private filterVisibleQuestions(
    questions: ValidatableQuestion[],
    answers: Record<string, unknown>,
    options: SurveyResponseValidateOptions,
  ): ValidatableQuestion[] {
    const { sections = [], participantData = {}, language } = options

    // If no conditions to evaluate, return all questions
    const hasGroupConditions = sections.some((g) => g.condition)
    const hasQuestionConditions = questions.some((q) => q.condition)
    if (!hasGroupConditions && !hasQuestionConditions) {
      return questions
    }

    // Build questionsInfo for the condition context
    const questionsInfo: QuestionInfo[] = questions.map((q, index) => ({
      code: q.code,
      type: q.type,
      position: index,
      answerOptionCodes: buildAnswerOptionCodesForQuestion(q),
      choiceOtherValue: getChoiceOtherValue(q),
    }))

    // Build surveyAnswers from the flat answers map
    const surveyAnswers = Object.entries(answers).map(([code, value]) => ({
      questionCode: code,
      value,
      selectedOptionCodes:
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? Object.keys(value).filter(
              (k) => (value as Record<string, unknown>)[k],
            )
          : value
            ? [String(value)]
            : [],
    }))

    const context = ExpressionContextBuilder.build(
      participantData,
      surveyAnswers,
      questionsInfo,
      { language },
    )

    // Evaluate group conditions once
    const groupVisible = new Map<string, boolean>()
    for (const section of sections) {
      if (section.condition) {
        const { shouldShow } = ConditionEvaluator.evaluate(
          section.condition,
          context,
        )
        groupVisible.set(section._id, shouldShow)
      }
    }

    return questions.filter((question) => {
      // Check group condition
      if (
        question.sectionId &&
        groupVisible.has(question.sectionId) &&
        !groupVisible.get(question.sectionId)
      ) {
        return false
      }

      // Check question condition
      if (question.condition) {
        return ConditionEvaluator.evaluate(question.condition, context)
          .shouldShow
      }

      return true
    })
  }

  private async validateMatrixSubquestions(
    question: ValidatableQuestion,
    matrixValue: unknown,
    language: string,
    defaultLanguage: string,
  ): Promise<ValidationMessage[]> {
    const subquestions = question.subquestions
      ? Array.from(question.subquestions)
      : []
    const answerOptions = question.answerOptions
      ? Array.from(question.answerOptions)
      : []
    const matrixData: Record<
      string,
      Record<string, unknown>
    > = typeof matrixValue === 'object' && matrixValue !== null
      ? (matrixValue as Record<string, Record<string, unknown>>)
      : {}
    const errors: ValidationMessage[] = []

    for (const sq of subquestions) {
      const sqValidate = buildEntityValidateConfig(sq)
      if (Object.keys(sqValidate).length === 0) continue

      const sqLabel = getSubquestionLabel(
        sq.text,
        sq.code,
        language,
        defaultLanguage,
      )

      if (sq.type === QUESTION_TYPE_CHECKBOX) {
        // Checkbox subquestions are validated as an aggregate: each subquestion
        // represents one checkbox question whose choices are the parent's answer
        // options. "Required" means at least one option is checked across the
        // entire subquestion column/row.
        const checkedCount = answerOptions.filter(
          (ao) => matrixData[sq.code]?.[ao.code] === true,
        ).length

        if (Boolean(sq.attributes?.required) && checkedCount === 0) {
          errors.push({
            key: 'validation.itemRequired',
            params: { label: sqLabel },
          })
          continue
        }

        const choiceMinMax = sq.attributes?.choiceMinMax
        if (choiceMinMax) {
          const { min, max } = choiceMinMax
          if (checkedCount < min || (max > 0 && checkedCount > max)) {
            errors.push(
              buildCountLimitError(
                'validation.matrixColumnChoiceCount',
                min,
                max,
                { column: sqLabel },
              ),
            )
          }
        }
      } else {
        const cellSchema = new Schema({
          cell: {
            $type: getMatrixCellValidationType(sq.type),
            $label: sqLabel,
            $validate: sqValidate,
          },
        })

        // Validate per-column: report once per failing subquestion, not once per cell
        for (const ao of answerOptions) {
          const cellValue = matrixData[sq.code]?.[ao.code]
          const { isValid, errors: cellErrors } = await cellSchema.validate({
            cell: cellValue,
          })
          if (!isValid && cellErrors?.cell) {
            errors.push({
              key: 'validation.itemRequired',
              params: { label: sqLabel },
            })
            break
          }
        }
      }
    }

    return errors
  }

  private async validateMultiPartSubquestions(
    question: ValidatableQuestion,
    multiPartValue: unknown,
    language: string,
    defaultLanguage: string,
  ): Promise<ValidationMessage[]> {
    const subquestions = question.subquestions
      ? Array.from(question.subquestions)
      : []
    const data: Record<string, unknown> =
      typeof multiPartValue === 'object' && multiPartValue !== null
        ? (multiPartValue as Record<string, unknown>)
        : {}
    const errors: ValidationMessage[] = []

    for (const sq of subquestions) {
      const sqValidate = buildEntityValidateConfig(sq)
      if (Object.keys(sqValidate).length === 0) continue

      const sqLabel = getSubquestionLabel(
        sq.text,
        sq.code,
        language,
        defaultLanguage,
      )
      const partSchema = new Schema({
        part: {
          $type: getMultiPartPartValidationType(sq.type),
          $label: sqLabel,
          $validate: sqValidate,
        },
      })

      const { isValid, errors: partErrors } = await partSchema.validate({
        part: data[sq.code],
      })
      if (!isValid && partErrors?.part) {
        errors.push({
          key: 'validation.itemRequired',
          params: { label: sqLabel },
        })
      }
    }

    return errors
  }
}

export default SurveyResponseValidator
