import {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswerOptionCollection,
  AnswerSkipDetail,
  ResponseMapping,
  MatrixCellValue,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_RANKING,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
  MultiPartValue,
} from 'veysur-common'

/**
 * Metadata answer keys that are not question codes but should always be transferred during merge.
 * These represent response-level metadata stored in the answers object.
 */
const METADATA_ANSWER_KEYS = [
  'LANG', // Language selection for multi-language surveys
  // Add future metadata keys here as needed
]

export class ResponseMapper {
  /**
   * Maps a single response from source to target survey structure
   */
  static mapResponse(
    sourceResponse: SurveyResponse,
    sourceSurvey: Survey,
    targetSurvey: Survey,
  ): ResponseMapping {
    const mappedAnswers: Record<string, unknown> = {}
    const skippedAnswers: AnswerSkipDetail[] = []

    // Iterate through each answer in the source response
    for (const [questionCode, answerValue] of Object.entries(
      sourceResponse.answers || {},
    )) {
      // Check if this is a metadata key (not a question code)
      if (METADATA_ANSWER_KEYS.includes(questionCode)) {
        // Metadata keys are always transferred as-is
        mappedAnswers[questionCode] = answerValue
        continue
      }

      // Find the question in both surveys by code
      const sourceQuestion =
        sourceSurvey.elements.getQuestionByCode(questionCode)
      const targetQuestion =
        targetSurvey.elements.getQuestionByCode(questionCode)

      // If question doesn't exist in source (shouldn't happen) or target, skip
      if (!sourceQuestion) {
        skippedAnswers.push({
          questionCode,
          reason: 'missing_question',
          originalValue: answerValue,
        })
        continue
      }

      if (!targetQuestion) {
        skippedAnswers.push({
          questionCode,
          reason: 'missing_question',
          originalValue: answerValue,
        })
        continue
      }

      // Validate and map the answer
      const validationResult = this.validateAnswer(
        questionCode,
        answerValue,
        sourceQuestion,
        targetQuestion,
      )

      if (validationResult.valid) {
        mappedAnswers[questionCode] = validationResult.mappedValue
      } else {
        skippedAnswers.push({
          questionCode,
          reason: validationResult.reason,
          originalValue: answerValue,
        })
      }
    }

    return {
      originalAnswers: (sourceResponse.answers || {}) as Record<
        string,
        unknown
      >,
      mappedAnswers,
      skippedAnswers,
    }
  }

  /**
   * Validates if an answer can be transferred
   */
  static validateAnswer(
    questionCode: string,
    answerValue: unknown,
    sourceQuestion: SurveyQuestion,
    targetQuestion: SurveyQuestion,
  ): {
    valid: boolean
    mappedValue?: unknown
    reason?: AnswerSkipDetail['reason']
  } {
    // Question types must match exactly - no automatic conversions
    if (sourceQuestion.type !== targetQuestion.type) {
      return { valid: false, reason: 'incompatible_type' }
    }

    // Handle different question types
    switch (targetQuestion.type) {
      case QUESTION_TYPE_TEXT:
      case QUESTION_TYPE_NUMBER:
      case QUESTION_TYPE_DATE:
      case QUESTION_TYPE_TIME:
      case QUESTION_TYPE_DATETIME:
        // Direct copy for free-form input types
        return { valid: true, mappedValue: answerValue }

      case QUESTION_TYPE_CHECKBOX:
      case QUESTION_TYPE_DROPDOWN:
      case QUESTION_TYPE_BUTTON:
      case QUESTION_TYPE_IMAGE_SELECT:
        // Answer-option questions - validate option codes exist
        return this.validateMultipleChoiceAnswer(
          answerValue,
          sourceQuestion.answerOptions,
          targetQuestion.answerOptions,
          targetQuestion,
        )

      case QUESTION_TYPE_YES_NO:
      case QUESTION_TYPE_STAR_RATING:
      case QUESTION_TYPE_POINT_5:
      case QUESTION_TYPE_POINT_10:
        // Fixed-option types - direct copy
        return { valid: true, mappedValue: answerValue }

      case QUESTION_TYPE_SURVEY_LANG_SELECT:
        // Survey language select - direct copy (validated language codes)
        return { valid: true, mappedValue: answerValue }

      case QUESTION_TYPE_MATRIX_TEXT:
      case QUESTION_TYPE_MATRIX_NUMBER:
      case QUESTION_TYPE_MATRIX_DATE:
      case QUESTION_TYPE_MATRIX_TIME:
      case QUESTION_TYPE_MATRIX_DATETIME:
      case QUESTION_TYPE_MATRIX_CHECKBOX:
      case QUESTION_TYPE_MATRIX_YES_NO:
      case QUESTION_TYPE_MATRIX_COMPOSITE:
        return this.validateMatrixAnswer(
          answerValue,
          sourceQuestion,
          targetQuestion,
        )

      case QUESTION_TYPE_RANKING:
        return this.validateRankingAnswer(
          answerValue,
          sourceQuestion.answerOptions,
          targetQuestion.answerOptions,
        )

      case QUESTION_TYPE_MULTI_PART_TEXT:
      case QUESTION_TYPE_MULTI_PART_NUMBER:
      case QUESTION_TYPE_MULTI_PART_YES_NO:
      case QUESTION_TYPE_MULTI_PART_STAR_RATING:
      case QUESTION_TYPE_MULTI_PART_POINT_5:
      case QUESTION_TYPE_MULTI_PART_POINT_10:
        return this.validateMultiPartAnswer(
          answerValue,
          sourceQuestion,
          targetQuestion,
        )

      default:
        // For unknown/custom types, reject to be safe
        return { valid: false, reason: 'incompatible_type' }
    }
  }

  /**
   * Validates multiple-choice answer
   * Accepts object format: { [optionCode]: true }
   */
  private static validateMultipleChoiceAnswer(
    answerValue: unknown,
    sourceOptions: SurveyAnswerOptionCollection,
    targetOptions: SurveyAnswerOptionCollection,
    targetQuestion: SurveyQuestion,
  ): {
    valid: boolean
    mappedValue?: unknown
    reason?: AnswerSkipDetail['reason']
  } {
    // Expect object format: { [optionCode]: true }
    if (
      typeof answerValue !== 'object' ||
      answerValue === null ||
      Array.isArray(answerValue)
    ) {
      return { valid: false, reason: 'incompatible_type' }
    }

    // Get selected option codes (keys with truthy values)
    const selectedCodes = Object.keys(answerValue).filter((k) => answerValue[k])

    if (selectedCodes.length === 0) {
      return { valid: true, mappedValue: {} }
    }

    const mappedValue: { [key: string]: true } = {}

    for (const optionCode of selectedCodes) {
      // Responses store answer option codes, not IDs
      // Validate that the code exists in both source and target

      // Check if option code exists in source
      const sourceOption = sourceOptions?.getByCode(optionCode)
      if (!sourceOption) {
        continue // Skip invalid options
      }

      // Check if the same option code exists in target
      const targetOption = targetOptions?.getByCode(optionCode)
      if (targetOption) {
        // Keep the code as-is (responses use codes, not IDs)
        mappedValue[optionCode] = true
      }
      // If option doesn't exist in target, it's silently skipped
    }

    // If no valid options remain, skip this answer
    const mappedCount = Object.keys(mappedValue).length
    if (mappedCount === 0) {
      return { valid: false, reason: 'missing_option' }
    }

    // Check chooseMax constraint
    // Merge philosophy: "Best attempt, no data loss"
    // - We allow answers with too few options (best attempt merge)
    // - We skip answers with too many options (can't merge entirely without data loss)
    const chooseMinMax = targetQuestion.attributes?.choiceMinMax
    const chooseMax = chooseMinMax?.max || 0

    // If max constraint exists (max > 0) and mapped values exceed it, skip
    if (chooseMax > 0 && mappedCount > chooseMax) {
      return { valid: false, reason: 'exceeds_maximum' }
    }

    return { valid: true, mappedValue }
  }

  /**
   * Validates a matrix answer against source and target questions.
   * Silently drops rows whose option code is missing from target,
   * and silently drops cells whose subquestion code is missing from target.
   */
  private static validateMatrixAnswer(
    answerValue: unknown,
    sourceQuestion: SurveyQuestion,
    targetQuestion: SurveyQuestion,
  ): {
    valid: boolean
    mappedValue?: unknown
    reason?: AnswerSkipDetail['reason']
  } {
    if (
      typeof answerValue !== 'object' ||
      answerValue === null ||
      Array.isArray(answerValue)
    ) {
      return { valid: false, reason: 'incompatible_type' }
    }

    const mappedValue: Record<string, Record<string, MatrixCellValue>> = {}
    let hadValidSubquestions = false

    for (const [subquestionCode, rowData] of Object.entries(answerValue)) {
      if (!sourceQuestion.subquestions?.getByCode(subquestionCode)) continue
      if (!targetQuestion.subquestions?.getByCode(subquestionCode)) continue

      hadValidSubquestions = true

      if (typeof rowData !== 'object' || rowData === null) continue

      const mappedRow: Record<string, MatrixCellValue> = {}
      for (const [optionCode, cellValue] of Object.entries(rowData as object)) {
        if (!sourceQuestion.answerOptions?.getByCode(optionCode)) continue
        if (!targetQuestion.answerOptions?.getByCode(optionCode)) continue
        mappedRow[optionCode] = cellValue as MatrixCellValue
      }

      if (Object.keys(mappedRow).length > 0) {
        mappedValue[subquestionCode] = mappedRow
      }
    }

    if (Object.keys(mappedValue).length === 0) {
      return {
        valid: false,
        reason: hadValidSubquestions ? 'missing_option' : 'missing_subquestion',
      }
    }

    return { valid: true, mappedValue }
  }

  /**
   * Validates a Multi-Part answer against source and target questions.
   * Flat response shape (`{ [partCode]: value }`, no answer-option axis) —
   * simpler than `validateMatrixAnswer`, which also filters by answer
   * option. Silently drops parts whose code is missing from the target.
   */
  private static validateMultiPartAnswer(
    answerValue: unknown,
    sourceQuestion: SurveyQuestion,
    targetQuestion: SurveyQuestion,
  ): {
    valid: boolean
    mappedValue?: unknown
    reason?: AnswerSkipDetail['reason']
  } {
    if (
      typeof answerValue !== 'object' ||
      answerValue === null ||
      Array.isArray(answerValue)
    ) {
      return { valid: false, reason: 'incompatible_type' }
    }

    const mappedValue: Record<string, MultiPartValue> = {}

    for (const [partCode, partValue] of Object.entries(answerValue)) {
      if (!sourceQuestion.subquestions?.getByCode(partCode)) continue
      if (!targetQuestion.subquestions?.getByCode(partCode)) continue
      mappedValue[partCode] = partValue as MultiPartValue
    }

    if (Object.keys(mappedValue).length === 0) {
      return { valid: false, reason: 'missing_subquestion' }
    }

    return { valid: true, mappedValue }
  }

  /**
   * Validates a ranking answer, filtering out option codes missing from the target survey.
   * ORDER is rebuilt from only the codes that survive the filter.
   */
  private static validateRankingAnswer(
    answerValue: unknown,
    sourceOptions: SurveyAnswerOptionCollection,
    targetOptions: SurveyAnswerOptionCollection,
  ): {
    valid: boolean
    mappedValue?: unknown
    reason?: AnswerSkipDetail['reason']
  } {
    if (
      typeof answerValue !== 'object' ||
      answerValue === null ||
      Array.isArray(answerValue)
    ) {
      return { valid: false, reason: 'incompatible_type' }
    }

    const order: string[] = Array.isArray(
      (answerValue as Record<string, unknown>).ORDER,
    )
      ? ((answerValue as Record<string, unknown>).ORDER as string[])
      : []

    const mappedValue: Record<string, unknown> = {}
    const mappedOrder: string[] = []

    for (const code of order) {
      if (!sourceOptions?.getByCode(code)) continue
      if (!targetOptions?.getByCode(code)) continue
      mappedValue[code] = true
      mappedOrder.push(code)
    }

    if (mappedOrder.length === 0) {
      return { valid: false, reason: 'missing_option' }
    }

    mappedValue.ORDER = mappedOrder
    return { valid: true, mappedValue }
  }

  /**
   * Maps answer options by code
   * Note: Responses store answer option codes, not IDs
   * Accepts object format: { [optionCode]: true }
   */
  static mapAnswerOptions(
    answerValue: { [key: string]: true } | string,
    sourceOptions: SurveyAnswerOptionCollection,
    targetOptions: SurveyAnswerOptionCollection,
  ): { mappedValue: unknown; skippedCodes: string[] } {
    const skippedCodes: string[] = []

    if (
      typeof answerValue === 'object' &&
      answerValue !== null &&
      !Array.isArray(answerValue)
    ) {
      // Multiple choice (object format)
      const mappedValue: { [key: string]: true } = {}

      for (const [optionCode, selected] of Object.entries(answerValue)) {
        if (!selected) continue // Skip unselected options

        // Verify code exists in source
        const sourceOption = sourceOptions?.getByCode(optionCode)
        if (!sourceOption) {
          skippedCodes.push(optionCode)
          continue
        }

        // Verify code exists in target
        const targetOption = targetOptions?.getByCode(optionCode)
        if (targetOption) {
          // Keep the code as-is (responses use codes, not IDs)
          mappedValue[optionCode] = true
        } else {
          skippedCodes.push(optionCode)
        }
      }

      return { mappedValue, skippedCodes }
    } else if (typeof answerValue === 'string') {
      // Single choice string (legacy or special case)
      const sourceOption = sourceOptions?.getByCode(answerValue)
      if (!sourceOption) {
        return { mappedValue: null, skippedCodes: [answerValue] }
      }

      const targetOption = targetOptions?.getByCode(answerValue)
      if (targetOption) {
        // Keep the code as-is (responses use codes, not IDs)
        return { mappedValue: answerValue, skippedCodes }
      } else {
        return { mappedValue: null, skippedCodes: [answerValue] }
      }
    }

    return { mappedValue: null, skippedCodes: [] }
  }
}
