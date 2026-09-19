import { ConditionParser } from './ConditionParser'
import {
  ConditionValidationResult,
  ConditionVariable,
  QuestionInfo,
  CONDITION_VARIABLE_TYPE_PARTICIPANT,
  CONDITION_VARIABLE_TYPE_QUESTION,
  CONDITION_VARIABLE_TYPE_ANSWER_OPTION,
  CONDITION_VARIABLE_TYPE_ANSWER_CODE,
  CONDITION_VARIABLE_TYPE_MATRIX_CELL,
  CONDITION_VARIABLE_TYPE_RESPONSE,
} from './types'
import { RESPONSE_FIELD_NAMES } from './responseFields'
import { isMatrixQuestionType } from '../../constructor/Survey/Matrix'
import { isMultiPartQuestionType } from '../../constructor/Survey/MultiPart'
import {
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
} from '../../constructor/Survey/attributeMeta/constants'
import { questionTypeHasReferenceableAnswerOptions } from './answerOptionReferenceability'
import { isSafeExpression } from '../SurveyExpression/ExpressionEvaluator'

export class ConditionValidator {
  /**
   * Validates a condition expression
   *
   * @param condition - The condition string to validate
   * @param availableQuestions - Questions available for reference (ordered by position)
   * @param currentPosition - Position of the element with this condition (for forward reference check)
   * @param participantVariableNames - Optional set of known participant variable names
   *                                   (system + custom attributes) for this survey; defaults
   *                                   to the system attribute names only when omitted
   * @returns Validation result with errors and referenced variables
   */
  static validate(
    condition: string | null,
    availableQuestions: QuestionInfo[],
    currentPosition: number,
    participantVariableNames?: Set<string>,
  ): ConditionValidationResult {
    const errors: string[] = []
    const referencedVariables: ConditionVariable[] = []

    // Empty conditions are valid
    if (!condition || condition.trim() === '') {
      return {
        isValid: true,
        errors: [],
        referencedVariables: [],
      }
    }

    // Check JavaScript syntax
    const syntaxError = this.validateSyntax(condition)
    if (syntaxError) {
      errors.push(syntaxError)
      return {
        isValid: false,
        errors,
        referencedVariables,
      }
    }

    // Build question lookup maps and collect all answer codes
    const questionByCode = new Map<string, QuestionInfo>()
    const answerOptionsByQuestion = new Map<string, Set<string>>()
    const allAnswerCodes = new Set<string>()

    for (const question of availableQuestions) {
      questionByCode.set(question.code, question)
      if (question.answerOptionCodes) {
        answerOptionsByQuestion.set(
          question.code,
          new Set(question.answerOptionCodes),
        )
        // Collect all answer option codes for parsing
        for (const optionCode of question.answerOptionCodes) {
          allAnswerCodes.add(optionCode)
        }
      }
    }

    // Extract variables from condition, passing available answer codes
    const variables = ConditionParser.extractVariables(
      condition,
      allAnswerCodes,
      participantVariableNames,
    )
    referencedVariables.push(...variables)

    // Validate each variable
    for (const variable of variables) {
      if (variable.type === CONDITION_VARIABLE_TYPE_PARTICIPANT) {
        // Participant variables are always valid
        continue
      }

      if (variable.type === CONDITION_VARIABLE_TYPE_RESPONSE) {
        // Unlike participant.* (survey-admin-extensible custom attributes),
        // response.* is a fixed, system-defined set - validate against it
        // to catch typos rather than silently passing through.
        if (!RESPONSE_FIELD_NAMES.includes(variable.name)) {
          errors.push(`Unknown response field: ${variable.name}`)
        }
        continue
      }

      if (variable.type === CONDITION_VARIABLE_TYPE_QUESTION) {
        const question = questionByCode.get(variable.questionCode!)
        if (!question) {
          errors.push(`Unknown question code: ${variable.questionCode}`)
          continue
        }

        // Check for forward reference
        if (question.position >= currentPosition) {
          errors.push(
            `Forward reference not allowed: ${variable.questionCode} (position ${question.position}) cannot be referenced from position ${currentPosition}`,
          )
        }
      }

      if (variable.type === CONDITION_VARIABLE_TYPE_ANSWER_OPTION) {
        const question = questionByCode.get(variable.questionCode!)
        if (!question) {
          errors.push(
            `Unknown question code in answer option reference: ${variable.questionCode}`,
          )
          continue
        }

        // Check for forward reference
        if (question.position >= currentPosition) {
          errors.push(
            `Forward reference not allowed: ${variable.questionCode} (position ${question.position}) cannot be referenced from ${currentPosition}`,
          )
          continue
        }

        // Multi-Part questions address parts as Q001.P001 - syntactically
        // identical to the answer-option dot notation, but validated against
        // the question's subquestions (parts) rather than answerOptions,
        // since Multi-Part has no answer-option axis.
        if (isMultiPartQuestionType(question.type)) {
          if (
            question.subquestions &&
            !question.subquestions.find(
              (s) => s.code === variable.answerOptionCode,
            )
          ) {
            errors.push(
              `Unknown part ${variable.answerOptionCode} for question ${variable.questionCode}`,
            )
          }
          continue
        }

        if (!questionTypeHasReferenceableAnswerOptions(question.type)) {
          errors.push(
            `${variable.questionCode} does not have addressable answer options (type: ${question.type})`,
          )
          continue
        }

        // Check if answer option exists (OTHER and OTHER_VALUE are valid if the question has choiceOther)
        const answerOptions = answerOptionsByQuestion.get(
          variable.questionCode!,
        )
        const isChoiceOtherCode =
          variable.answerOptionCode === CHOICE_OTHER_CODE ||
          variable.answerOptionCode === CHOICE_OTHER_VALUE_KEY
        if (isChoiceOtherCode && !question.choiceOtherValue) {
          const label =
            variable.answerOptionCode === CHOICE_OTHER_CODE
              ? '"Other" answer selected'
              : '"Other" value'
          errors.push(
            `Condition references ${label} for ${variable.questionCode}, but the "Other" option is not enabled`,
          )
        } else if (
          !isChoiceOtherCode &&
          answerOptions &&
          !answerOptions.has(variable.answerOptionCode!)
        ) {
          // A bare matrix row (`Q001.S001`) has no single value - the
          // reference has to name a specific cell.
          const isSubquestion = question.subquestions?.some(
            (s) => s.code === variable.answerOptionCode,
          )
          errors.push(
            isSubquestion
              ? `${variable.questionCode}.${variable.answerOptionCode} is a matrix row, not an answer option - reference a specific cell (${variable.questionCode}.${variable.answerOptionCode}.<optionCode>)`
              : `Unknown answer option code: ${variable.answerOptionCode} for question ${variable.questionCode}`,
          )
        }
      }

      if (variable.type === CONDITION_VARIABLE_TYPE_ANSWER_CODE) {
        // Standalone answer code constant (e.g., A001)
        // Validate that it exists in some question's answer options
        if (!allAnswerCodes.has(variable.answerOptionCode!)) {
          errors.push(`Unknown answer code: ${variable.answerOptionCode}`)
        }
      }

      if (variable.type === CONDITION_VARIABLE_TYPE_MATRIX_CELL) {
        const question = questionByCode.get(variable.questionCode!)
        if (!question) {
          errors.push(`Unknown question code: ${variable.questionCode}`)
          continue
        }

        if (!isMatrixQuestionType(question.type)) {
          errors.push(`${variable.questionCode} is not a matrix question`)
          continue
        }

        if (question.position >= currentPosition) {
          errors.push(`Forward reference not allowed: ${variable.questionCode}`)
          continue
        }

        if (
          question.answerOptionCodes &&
          !question.answerOptionCodes.includes(variable.answerOptionCode!)
        ) {
          errors.push(
            `Unknown answer option ${variable.answerOptionCode} for question ${variable.questionCode}`,
          )
        }

        if (
          question.subquestions &&
          !question.subquestions.find(
            (s) => s.code === variable.subquestionCode,
          )
        ) {
          errors.push(
            `Unknown subquestion ${variable.subquestionCode} for question ${variable.questionCode}`,
          )
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      referencedVariables,
    }
  }

  /**
   * Validates JavaScript syntax of a condition
   * Returns error message if invalid, null if valid
   */
  private static validateSyntax(condition: string): string | null {
    try {
      // Try to parse as an expression
      // We wrap in parentheses to ensure it's treated as an expression
      new Function(`"use strict"; return (${condition});`)
      return null
    } catch (error) {
      if (error instanceof SyntaxError) {
        return `Invalid syntax: ${error.message}`
      }
      return `Validation error: ${String(error)}`
    }
  }

  /**
   * Checks if a condition is safe to evaluate (no dangerous constructs).
   * @deprecated moved to `SurveyExpression/ExpressionEvaluator.isSafeExpression`
   * since the blocklist applies to any JS expression, not just conditions -
   * kept here as a thin re-export for existing callers.
   */
  static isSafeExpression(condition: string): boolean {
    return isSafeExpression(condition)
  }
}
