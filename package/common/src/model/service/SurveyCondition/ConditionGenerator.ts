import {
  ConditionOperand,
  ConditionExpression,
  ConditionGroup,
  ConditionNode,
  ConditionTree,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_ANSWER_VALUE,
  CONDITION_OPERAND_TYPE_ANSWER_OPTION,
  CONDITION_OPERAND_TYPE_PARTICIPANT,
  CONDITION_OPERAND_TYPE_LITERAL,
  CONDITION_OPERAND_TYPE_MATRIX_CELL,
  CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_RESPONSE,
  isBooleanShorthandOperandType,
} from './types'

/**
 * Generates JavaScript code from a condition tree
 */
export class ConditionGenerator {
  /**
   * Check if an operand is empty/incomplete
   */
  static isOperandEmpty(operand: ConditionOperand): boolean {
    switch (operand.type) {
      case CONDITION_OPERAND_TYPE_QUESTION:
        return !operand.questionCode
      case CONDITION_OPERAND_TYPE_ANSWER_SELECTED:
      case CONDITION_OPERAND_TYPE_ANSWER_VALUE:
        return !operand.questionCode || !operand.optionCode
      case CONDITION_OPERAND_TYPE_MATRIX_CELL:
      case CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED:
        return (
          !operand.questionCode ||
          !operand.optionCode ||
          !operand.subquestionCode
        )
      case CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED:
        return (
          !operand.questionCode ||
          !operand.subquestionCode ||
          operand.literalValue === undefined ||
          operand.literalValue === ''
        )
      case CONDITION_OPERAND_TYPE_ANSWER_OPTION:
        return !operand.optionCode
      case CONDITION_OPERAND_TYPE_PARTICIPANT:
        return !operand.participantVar
      case CONDITION_OPERAND_TYPE_RESPONSE:
        return !operand.responseVar
      case CONDITION_OPERAND_TYPE_LITERAL:
        return operand.literalValue === undefined || operand.literalValue === ''
      default:
        return true
    }
  }

  /**
   * Check if an expression is complete and can generate valid JavaScript
   */
  static isExpressionComplete(expr: ConditionExpression): boolean {
    const leftEmpty = this.isOperandEmpty(expr.left)

    // answerSelected type (e.g., Q001.A002) is a boolean — complete without operator/right
    // answerValue type (e.g., Q001.OTHER_VALUE) is a value — requires operator + right
    // matrixAnswerSelected (e.g., Q001.S001.A004) is likewise a boolean shorthand
    if (isBooleanShorthandOperandType(expr.left.type)) {
      return !leftEmpty
    }

    // All other types need operator and right operand
    if (!expr.operator || !expr.right) {
      return false
    }

    return !leftEmpty && !this.isOperandEmpty(expr.right)
  }

  /**
   * Convert an operand to its JavaScript representation
   */
  static operandToJs(operand: ConditionOperand): string {
    switch (operand.type) {
      case CONDITION_OPERAND_TYPE_QUESTION:
        // Question answer value: answers.Q001
        return operand.questionCode ? `answers.${operand.questionCode}` : ''

      case CONDITION_OPERAND_TYPE_ANSWER_SELECTED:
      case CONDITION_OPERAND_TYPE_ANSWER_VALUE:
        // Dot-notation sub-field access: answers.Q001.A002 (boolean) or
        // answers.Q001.OTHER_VALUE (value)
        return `answers.${operand.questionCode}.${operand.optionCode}`

      case CONDITION_OPERAND_TYPE_MATRIX_CELL:
      case CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED:
        // Matrix cell value: answers.Q001.S001.A001 (nested object property access)
        return `answers.${operand.questionCode}.${operand.subquestionCode}.${operand.optionCode}`

      case CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED:
        // Multi-Part part compared to its already-resolved predefined value:
        // answers.Q001.P001 === true / answers.Q001.P001 === 7 (flat property
        // access, no answer-option axis to nest into, unlike a matrix cell)
        return `answers.${operand.questionCode}.${operand.subquestionCode} === ${this.literalToJs(operand.literalValue)}`

      case CONDITION_OPERAND_TYPE_ANSWER_OPTION:
        // Answer option code as constant: A001 (no container root - a bare literal)
        return operand.optionCode || ''

      case CONDITION_OPERAND_TYPE_PARTICIPANT:
        // Participant variable: participant.email, participant.language, etc.
        return operand.participantVar
          ? `participant.${operand.participantVar}`
          : ''

      case CONDITION_OPERAND_TYPE_RESPONSE:
        // Response metadata: response.language, etc.
        return operand.responseVar ? `response.${operand.responseVar}` : ''

      case CONDITION_OPERAND_TYPE_LITERAL:
        // Custom literal value
        return this.literalToJs(operand.literalValue)

      default:
        return ''
    }
  }

  /**
   * Convert a literal value to its JavaScript source representation.
   */
  private static literalToJs(
    literalValue: string | number | boolean | undefined,
  ): string {
    if (typeof literalValue === 'string') {
      return JSON.stringify(literalValue)
    }
    if (typeof literalValue === 'number') {
      return String(literalValue)
    }
    if (typeof literalValue === 'boolean') {
      return String(literalValue)
    }
    return ''
  }

  /**
   * Check if expression is comparing a question value with an answer option.
   * Multiple choice answers are stored as objects { A001: true }, so we use
   * dot notation (Q001.A001) for these comparisons.
   */
  static isQuestionToAnswerOptionComparison(
    expr: ConditionExpression,
  ): boolean {
    return (
      expr.left.type === CONDITION_OPERAND_TYPE_QUESTION &&
      expr.right?.type === CONDITION_OPERAND_TYPE_ANSWER_OPTION &&
      (expr.operator === '===' || expr.operator === '!==')
    )
  }

  /**
   * Convert an expression to its JavaScript representation
   */
  static expressionToJs(expr: ConditionExpression): string {
    const left = this.operandToJs(expr.left)

    // If left operand is answerSelected/matrixAnswerSelected (boolean), no operator or right operand needed
    if (isBooleanShorthandOperandType(expr.left.type)) {
      return left
    }

    // If no operator, just return the left operand
    if (!expr.operator || !expr.right) {
      return left
    }

    const right = this.operandToJs(expr.right)

    // Handle includes operator - convert to dot notation for answer options
    // since multiple choice answers are now objects, not arrays
    if (expr.operator === 'includes') {
      if (expr.right?.type === CONDITION_OPERAND_TYPE_ANSWER_OPTION) {
        // Q001.includes(A001) -> Q001.A001 (object property access)
        return `${left}.${right}`
      }
      // For string includes (e.g., Q001.includes("text")), keep method syntax
      return `${left}.includes(${right})`
    }

    // Multiple choice answers are objects { A001: true }, so use dot notation
    // for equality comparisons with answer options: Q001.A001 (truthy/falsy)
    if (this.isQuestionToAnswerOptionComparison(expr)) {
      if (expr.operator === '===') {
        return `${left}.${right}`
      }
      if (expr.operator === '!==') {
        return `!${left}.${right}`
      }
    }

    // An answer-option operand outside the dot-notation case above (e.g. the left
    // operand is a matrix cell, not a plain question) has no bound representation —
    // `operandToJs` emits its bare option code (e.g. A001), which is not a valid
    // standalone JS reference. Quote it as a string literal so the generated
    // expression always evaluates deterministically instead of throwing a
    // ReferenceError.
    if (expr.right?.type === CONDITION_OPERAND_TYPE_ANSWER_OPTION) {
      return `${left} ${expr.operator} ${JSON.stringify(right)}`
    }

    // Standard binary operators
    return `${left} ${expr.operator} ${right}`
  }

  /**
   * Convert a condition node (expression or group) to JavaScript
   * Returns null for incomplete expressions that should be skipped
   */
  static nodeToJs(node: ConditionNode, depth: number = 0): string | null {
    if (node.type === 'expression') {
      if (!this.isExpressionComplete(node.expression)) {
        return null // Skip incomplete expressions
      }
      return this.expressionToJs(node.expression)
    }

    // It's a group
    return this.groupToJs(node.group, depth)
  }

  /**
   * Convert a condition group to JavaScript
   */
  static groupToJs(group: ConditionGroup, depth: number = 0): string {
    if (group.items.length === 0) {
      return ''
    }

    // Filter out incomplete expressions (nulls)
    const expressions = group.items
      .map((item) => this.nodeToJs(item, depth + 1))
      .filter((js): js is string => js !== null && js !== '')

    if (expressions.length === 0) {
      return ''
    }

    if (expressions.length === 1) {
      return expressions[0]
    }

    const combined = expressions.join(` ${group.combinator} `)

    // Wrap nested groups in parentheses for clarity
    if (depth > 0) {
      return `(${combined})`
    }

    return combined
  }

  /**
   * Convert a full condition tree to JavaScript code
   */
  static treeToJs(tree: ConditionTree): string {
    return this.groupToJs(tree.root, 0)
  }
}
