import { SurveyQuestion } from '../../constructor/Survey/SurveyQuestion'
import { IncompatibilityDetail } from './types'
import {
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_CHOICE_MIN_MAX,
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  MinMax,
} from '../../constructor/Survey/attributeMeta'

/**
 * Checks compatibility of question attributes between two surveys
 *
 * Compatibility is strict: target survey must not have stricter constraints than source.
 * This ensures that existing responses from source can be validly merged into target.
 */
export class AttributeCompatibilityChecker {
  /**
   * Check if questionA's attributes are compatible with questionB
   * Returns array of incompatibility details
   */
  checkQuestionAttributes(
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): IncompatibilityDetail[] {
    const incompatibilities: IncompatibilityDetail[] = []

    // Check required attribute (applies to all question types)
    const requiredIncompat = this.checkRequired(
      questionA.code,
      questionA,
      questionB,
    )
    if (requiredIncompat) {
      incompatibilities.push(requiredIncompat)
    }

    // Check type-specific attributes based on question type
    switch (questionB.type) {
      case QUESTION_TYPE_TEXT: {
        const lengthIncompat = this.checkLengthMinMax(
          questionA.code,
          questionA,
          questionB,
        )
        if (lengthIncompat) {
          incompatibilities.push(lengthIncompat)
        }
        break
      }

      case QUESTION_TYPE_NUMBER: {
        const numberIncompat = this.checkNumberMinMax(
          questionA.code,
          questionA,
          questionB,
        )
        if (numberIncompat) {
          incompatibilities.push(numberIncompat)
        }

        const negIncompat = this.checkNumberNegAllowed(
          questionA.code,
          questionA,
          questionB,
        )
        if (negIncompat) {
          incompatibilities.push(negIncompat)
        }
        break
      }

      case QUESTION_TYPE_CHECKBOX:
      case QUESTION_TYPE_DROPDOWN:
      case QUESTION_TYPE_BUTTON:
      case QUESTION_TYPE_IMAGE_SELECT: {
        const choiceIncompat = this.checkChooseMinMax(
          questionA.code,
          questionA,
          questionB,
        )
        if (choiceIncompat) {
          incompatibilities.push(choiceIncompat)
        }
        break
      }
    }

    return incompatibilities
  }

  /**
   * Check 'required' attribute compatibility
   * Incompatible if: questionB.required === true && questionA.required === false
   * Reason: Existing responses may have empty answers which would violate new requirement
   */
  private checkRequired(
    questionCode: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): IncompatibilityDetail | null {
    const requiredA = Boolean(
      questionA.attributes?.[ATTRIBUTE_QUESTION_REQUIRED],
    )
    const requiredB = Boolean(
      questionB.attributes?.[ATTRIBUTE_QUESTION_REQUIRED],
    )

    // Incompatible if target requires but source didn't
    if (!requiredA && requiredB) {
      return {
        path: `questions[${questionCode}].attributes.${ATTRIBUTE_QUESTION_REQUIRED}`,
        reason: 'incompatible_required_constraint',
        itemType: 'question',
        itemCode: questionCode,
        attributeName: ATTRIBUTE_QUESTION_REQUIRED,
        sourceAttributeValue: requiredA,
        targetAttributeValue: requiredB,
        message: `Question '${questionCode}' is now required but was optional in source survey`,
      }
    }

    return null
  }

  /**
   * Check 'chooseMinMax' attribute compatibility (multiple choice)
   * Incompatible if target constraints are stricter than source
   */
  private checkChooseMinMax(
    questionCode: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): IncompatibilityDetail | null {
    const chooseMinMaxA = questionA.attributes?.[ATTRIBUTE_CHOICE_MIN_MAX] as
      Partial<MinMax> | undefined
    const chooseMinMaxB = questionB.attributes?.[ATTRIBUTE_CHOICE_MIN_MAX] as
      Partial<MinMax> | undefined

    // If neither has constraints, compatible
    if (!chooseMinMaxA && !chooseMinMaxB) {
      return null
    }

    // Get min/max values, defaulting to 0 (no constraint)
    const sourceMin = chooseMinMaxA?.min || 0
    const sourceMax = chooseMinMaxA?.max || 0
    const targetMin = chooseMinMaxB?.min || 0
    const targetMax = chooseMinMaxB?.max || 0

    // Check if target is stricter
    if (
      this.isMinMaxStricter(
        { min: sourceMin, max: sourceMax },
        { min: targetMin, max: targetMax },
      )
    ) {
      return {
        path: `questions[${questionCode}].attributes.${ATTRIBUTE_CHOICE_MIN_MAX}`,
        reason: 'incompatible_choice_constraint',
        itemType: 'question',
        itemCode: questionCode,
        attributeName: ATTRIBUTE_CHOICE_MIN_MAX,
        sourceAttributeValue: { min: sourceMin, max: sourceMax },
        targetAttributeValue: { min: targetMin, max: targetMax },
        message: `Question '${questionCode}' has stricter choice constraints (source: min=${sourceMin}, max=${sourceMax}; target: min=${targetMin}, max=${targetMax})`,
      }
    }

    return null
  }

  /**
   * Check 'lengthMinMax' attribute compatibility (text)
   * Incompatible if target constraints are stricter than source
   */
  private checkLengthMinMax(
    questionCode: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): IncompatibilityDetail | null {
    const lengthMinMaxA = questionA.attributes?.[
      ATTRIBUTE_QUESTION_LENGTH_MIN_MAX
    ] as Partial<MinMax> | undefined
    const lengthMinMaxB = questionB.attributes?.[
      ATTRIBUTE_QUESTION_LENGTH_MIN_MAX
    ] as Partial<MinMax> | undefined

    // If neither has constraints, compatible
    if (!lengthMinMaxA && !lengthMinMaxB) {
      return null
    }

    // Get min/max values, defaulting to 0 (no constraint)
    const sourceMin = lengthMinMaxA?.min || 0
    const sourceMax = lengthMinMaxA?.max || 0
    const targetMin = lengthMinMaxB?.min || 0
    const targetMax = lengthMinMaxB?.max || 0

    // Check if target is stricter
    if (
      this.isMinMaxStricter(
        { min: sourceMin, max: sourceMax },
        { min: targetMin, max: targetMax },
      )
    ) {
      return {
        path: `questions[${questionCode}].attributes.${ATTRIBUTE_QUESTION_LENGTH_MIN_MAX}`,
        reason: 'incompatible_length_constraint',
        itemType: 'question',
        itemCode: questionCode,
        attributeName: ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
        sourceAttributeValue: { min: sourceMin, max: sourceMax },
        targetAttributeValue: { min: targetMin, max: targetMax },
        message: `Question '${questionCode}' has stricter length constraints (source: min=${sourceMin}, max=${sourceMax}; target: min=${targetMin}, max=${targetMax})`,
      }
    }

    return null
  }

  /**
   * Check 'numberMinMax' attribute compatibility (number)
   * Incompatible if target constraints are stricter than source
   */
  private checkNumberMinMax(
    questionCode: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): IncompatibilityDetail | null {
    const numberMinMaxA = questionA.attributes?.[
      ATTRIBUTE_QUESTION_NUMBER_MIN_MAX
    ] as Partial<MinMax> | undefined
    const numberMinMaxB = questionB.attributes?.[
      ATTRIBUTE_QUESTION_NUMBER_MIN_MAX
    ] as Partial<MinMax> | undefined

    // If neither has constraints, compatible
    if (!numberMinMaxA && !numberMinMaxB) {
      return null
    }

    // Get min/max values, defaulting to 0 (no constraint)
    const sourceMin = numberMinMaxA?.min || 0
    const sourceMax = numberMinMaxA?.max || 0
    const targetMin = numberMinMaxB?.min || 0
    const targetMax = numberMinMaxB?.max || 0

    // Check if target is stricter
    if (
      this.isMinMaxStricter(
        { min: sourceMin, max: sourceMax },
        { min: targetMin, max: targetMax },
      )
    ) {
      return {
        path: `questions[${questionCode}].attributes.${ATTRIBUTE_QUESTION_NUMBER_MIN_MAX}`,
        reason: 'incompatible_number_constraint',
        itemType: 'question',
        itemCode: questionCode,
        attributeName: ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
        sourceAttributeValue: { min: sourceMin, max: sourceMax },
        targetAttributeValue: { min: targetMin, max: targetMax },
        message: `Question '${questionCode}' has stricter number constraints (source: min=${sourceMin}, max=${sourceMax}; target: min=${targetMin}, max=${targetMax})`,
      }
    }

    return null
  }

  /**
   * Check 'numberNegAllowed' attribute compatibility (number)
   * Incompatible if: questionB.numberNegAllowed === false && questionA.numberNegAllowed === true
   * Reason: Existing responses may have negative values which would be invalid
   */
  private checkNumberNegAllowed(
    questionCode: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): IncompatibilityDetail | null {
    const negAllowedA = Boolean(
      questionA.attributes?.[ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED],
    )
    const negAllowedB = Boolean(
      questionB.attributes?.[ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED],
    )

    // Incompatible if source allowed negatives but target doesn't
    if (negAllowedA && !negAllowedB) {
      return {
        path: `questions[${questionCode}].attributes.${ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED}`,
        reason: 'incompatible_negative_constraint',
        itemType: 'question',
        itemCode: questionCode,
        attributeName: ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
        sourceAttributeValue: negAllowedA,
        targetAttributeValue: negAllowedB,
        message: `Question '${questionCode}' no longer allows negative numbers but source did`,
      }
    }

    return null
  }

  /**
   * Helper: Check if minMax constraint became stricter
   * Returns true if targetMinMax is stricter than sourceMinMax
   *
   * Target is stricter if:
   * 1. min increased (requires MORE than before)
   * 2. max decreased (allows LESS than before)
   * 3. max is now enforced when it wasn't before (0 = unlimited)
   */
  private isMinMaxStricter(
    sourceMinMax: { min: number; max: number },
    targetMinMax: { min: number; max: number },
  ): boolean {
    // Min increased (stricter)
    if (targetMinMax.min > sourceMinMax.min) {
      return true
    }

    // Max was unlimited (0) but now has limit (stricter)
    if (sourceMinMax.max === 0 && targetMinMax.max > 0) {
      return true
    }

    // Max decreased (stricter), but only if both had limits
    if (
      sourceMinMax.max > 0 &&
      targetMinMax.max > 0 &&
      targetMinMax.max < sourceMinMax.max
    ) {
      return true
    }

    return false
  }
}
