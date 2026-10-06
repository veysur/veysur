import {
  ConditionVariable,
  CONDITION_VARIABLE_TYPE_PARTICIPANT,
  CONDITION_VARIABLE_TYPE_QUESTION,
  CONDITION_VARIABLE_TYPE_ANSWER_OPTION,
  CONDITION_VARIABLE_TYPE_ANSWER_CODE,
  CONDITION_VARIABLE_TYPE_MATRIX_CELL,
  CONDITION_VARIABLE_TYPE_RESPONSE,
} from './types'
import {
  ENTITY_CODE_IDENTIFIER_PATTERN,
  ENTITY_CODE_ANSWER_OPTION_DOT_PATTERN,
  ENTITY_CODE_MATRIX_CELL_PATTERN,
  ENTITY_CODE_PARTICIPANT_PATTERN,
  ENTITY_CODE_RESPONSE_PATTERN,
  ENTITY_CODE_BARE_IDENTIFIER_PATTERN,
} from '../../schema/constant'

// JavaScript keywords and built-ins to exclude from variable extraction
const JS_KEYWORDS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'if',
  'else',
  'return',
  'var',
  'let',
  'const',
  'function',
  'new',
  'this',
  'typeof',
  'instanceof',
  'in',
  'of',
  'for',
  'while',
  'do',
  'break',
  'continue',
  'switch',
  'case',
  'default',
  'try',
  'catch',
  'finally',
  'throw',
  'class',
  'extends',
  'super',
  'import',
  'export',
  'from',
  'as',
  'async',
  'await',
  'yield',
  'delete',
  'void',
  'with',
  'debugger',
  'NaN',
  'Infinity',
  'Math',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'RegExp',
  'Error',
  'JSON',
  'console',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'includes',
  'indexOf',
  'length',
  'toString',
  'valueOf',
  'hasOwnProperty',
])

export class ConditionParser {
  /**
   * Removes string literals from condition to avoid matching variables inside quotes
   */
  private static removeStringLiterals(condition: string): string {
    let result = ''
    let i = 0
    while (i < condition.length) {
      const quote = condition[i]
      if (quote !== '"' && quote !== "'" && quote !== '`') {
        result += quote
        i++
        continue
      }
      let end = i + 1
      while (end < condition.length && condition[end] !== quote) {
        end += condition[end] === '\\' ? 2 : 1
      }
      if (end >= condition.length) {
        // Unterminated literal: leave the quote in place, as the old pattern did
        result += quote
        i++
      } else {
        i = end + 1
      }
    }
    return result
  }

  /**
   * Runs one variable-reference pattern over `processedCondition`: for each
   * match, `buildVariable` decides whether to keep it (returning the
   * `ConditionVariable` plus the captured parts to keyword-check) or skip it
   * (returning `null`). Kept matches are recorded in `seen`, added to the
   * result, and masked out of the condition (so a later, broader pattern in
   * the same `extractVariables` call can't re-match the same text).
   */
  private static matchAndMask(
    processedCondition: string,
    pattern: RegExp,
    seen: Set<string>,
    buildVariable: (
      match: RegExpMatchArray,
    ) => { variable: ConditionVariable; keywordParts: string[] } | null,
  ): { processedCondition: string; variables: ConditionVariable[] } {
    const variables: ConditionVariable[] = []

    for (const match of processedCondition.matchAll(new RegExp(pattern))) {
      const fullMatch = match[0]
      const built = buildVariable(match)
      if (!built) {
        continue
      }
      if (built.keywordParts.some((part) => JS_KEYWORDS.has(part))) {
        continue
      }
      if (seen.has(fullMatch)) {
        continue
      }

      seen.add(fullMatch)
      variables.push(built.variable)
      processedCondition = processedCondition.replace(
        new RegExp(fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        '___',
      )
    }

    return { processedCondition, variables }
  }

  /**
   * Extracts all variable references from a condition string. Container-rooted
   * form: `answers.Q001`, `answers.Q001.A001`, `answers.Q001.S001.A001`,
   * `participant.email`. Bare (unprefixed) identifiers are only ever
   * answer-option-code literals (e.g. `A001`) - `ConditionVariable.name` is
   * stored unprefixed in every case; only the root type differs.
   *
   * @param condition - The condition string to parse
   * @param availableAnswerCodes - Optional set of known answer codes (e.g., A001, A002)
   *                               to distinguish standalone answer codes from question codes
   * @param participantVariableNames - Unused for classification (participant
   *                               variables are now identified purely by the
   *                               `participant.` prefix); accepted for call-site
   *                               compatibility
   */
  static extractVariables(
    condition: string,
    availableAnswerCodes?: Set<string>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    participantVariableNames?: Set<string>,
  ): ConditionVariable[] {
    if (!condition || typeof condition !== 'string') {
      return []
    }

    // Remove string literals to avoid matching content inside quotes
    let processedCondition = this.removeStringLiterals(condition)

    const variables: ConditionVariable[] = []
    const seen = new Set<string>()

    // First, extract matrix cell references (answers.Q001.S001.A001 format)
    // before double-dot patterns
    const matrixCellResult = this.matchAndMask(
      processedCondition,
      ENTITY_CODE_MATRIX_CELL_PATTERN,
      seen,
      (match) => {
        const questionCode = match[1]
        const subquestionCode = match[2]
        const answerOptionCode = match[3]
        return {
          variable: {
            name: `${questionCode}.${subquestionCode}.${answerOptionCode}`,
            type: CONDITION_VARIABLE_TYPE_MATRIX_CELL,
            questionCode,
            answerOptionCode,
            subquestionCode,
          },
          keywordParts: [questionCode, answerOptionCode, subquestionCode],
        }
      },
    )
    processedCondition = matrixCellResult.processedCondition
    variables.push(...matrixCellResult.variables)

    // Then, extract answer option references with dot notation
    // (answers.Q001.A002 format)
    const dotAnswerOptionResult = this.matchAndMask(
      processedCondition,
      ENTITY_CODE_ANSWER_OPTION_DOT_PATTERN,
      seen,
      (match) => {
        const questionCode = match[1]
        const answerOptionCode = match[2]
        return {
          variable: {
            name: `${questionCode}.${answerOptionCode}`,
            type: CONDITION_VARIABLE_TYPE_ANSWER_OPTION,
            questionCode,
            answerOptionCode,
          },
          keywordParts: [answerOptionCode, questionCode],
        }
      },
    )
    processedCondition = dotAnswerOptionResult.processedCondition
    variables.push(...dotAnswerOptionResult.variables)

    // Then, extract bare question references (answers.Q001 format)
    const questionResult = this.matchAndMask(
      processedCondition,
      ENTITY_CODE_IDENTIFIER_PATTERN,
      seen,
      (match) => {
        const questionCode = match[1]
        return {
          variable: {
            name: questionCode,
            type: CONDITION_VARIABLE_TYPE_QUESTION,
            questionCode,
          },
          keywordParts: [questionCode],
        }
      },
    )
    processedCondition = questionResult.processedCondition
    variables.push(...questionResult.variables)

    // Then, extract participant variable references (participant.email format)
    const participantResult = this.matchAndMask(
      processedCondition,
      ENTITY_CODE_PARTICIPANT_PATTERN,
      seen,
      (match) => {
        const participantVar = match[1]
        return {
          variable: {
            name: participantVar,
            type: CONDITION_VARIABLE_TYPE_PARTICIPANT,
          },
          keywordParts: [participantVar],
        }
      },
    )
    processedCondition = participantResult.processedCondition
    variables.push(...participantResult.variables)

    // Then, extract response-metadata references (response.language format)
    const responseResult = this.matchAndMask(
      processedCondition,
      ENTITY_CODE_RESPONSE_PATTERN,
      seen,
      (match) => {
        const responseVar = match[1]
        return {
          variable: {
            name: responseVar,
            type: CONDITION_VARIABLE_TYPE_RESPONSE,
          },
          keywordParts: [responseVar],
        }
      },
    )
    processedCondition = responseResult.processedCondition
    variables.push(...responseResult.variables)

    // Finally, whatever bare identifiers remain are answer-option-code literals
    // (e.g. A001) - the only reference form with no container root
    const bareMatches = processedCondition.matchAll(
      new RegExp(ENTITY_CODE_BARE_IDENTIFIER_PATTERN),
    )
    for (const match of bareMatches) {
      const name = match[1]

      if (seen.has(name) || JS_KEYWORDS.has(name)) {
        continue
      }
      seen.add(name)

      if (availableAnswerCodes?.has(name)) {
        variables.push({
          name,
          type: CONDITION_VARIABLE_TYPE_ANSWER_CODE,
          answerOptionCode: name,
        })
      } else {
        // Unknown bare identifier - still classify as an answer-code
        // reference so ConditionValidator can flag it as unknown, rather
        // than silently ignoring it.
        variables.push({
          name,
          type: CONDITION_VARIABLE_TYPE_ANSWER_CODE,
          answerOptionCode: name,
        })
      }
    }

    return variables
  }

  /**
   * Gets the question codes referenced in a condition (excluding participant variables and answer option codes)
   */
  static getReferencedQuestionCodes(
    condition: string,
    participantVariableNames?: Set<string>,
  ): string[] {
    const variables = this.extractVariables(
      condition,
      undefined,
      participantVariableNames,
    )
    const questionCodes = new Set<string>()

    for (const variable of variables) {
      if (
        variable.type === CONDITION_VARIABLE_TYPE_QUESTION &&
        variable.questionCode
      ) {
        questionCodes.add(variable.questionCode)
      } else if (
        variable.type === CONDITION_VARIABLE_TYPE_ANSWER_OPTION &&
        variable.questionCode
      ) {
        questionCodes.add(variable.questionCode)
      } else if (
        variable.type === CONDITION_VARIABLE_TYPE_MATRIX_CELL &&
        variable.questionCode
      ) {
        questionCodes.add(variable.questionCode)
      }
    }

    return Array.from(questionCodes)
  }

  /**
   * Gets the raw referenced codes in a condition (question/answer-option/matrix-cell
   * codes as written, e.g. `Q001`, `Q001.A002`, `Q001.S001.A002`), excluding
   * participant variables. Used to build the `conditionReferences` cache field.
   */
  static getReferencedCodes(
    condition: string,
    participantVariableNames?: Set<string>,
  ): string[] {
    const variables = this.extractVariables(
      condition,
      undefined,
      participantVariableNames,
    )
    const codes = new Set<string>()

    for (const variable of variables) {
      if (
        variable.type === CONDITION_VARIABLE_TYPE_PARTICIPANT ||
        variable.type === CONDITION_VARIABLE_TYPE_RESPONSE
      ) {
        continue
      }
      codes.add(variable.name)
    }

    return Array.from(codes)
  }
}
