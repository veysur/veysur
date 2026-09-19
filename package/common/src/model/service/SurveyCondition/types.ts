// ExpressionContext/ParticipantData (the shared answers/participant/response
// evaluation scope) live in `../SurveyExpression/types` - it's the same
// context used by expressions embedded in survey text, not condition-only.

// ============================================================================
// ConditionVariable type constants
// ============================================================================

export const CONDITION_VARIABLE_TYPE_PARTICIPANT = 'participant' as const
export const CONDITION_VARIABLE_TYPE_QUESTION = 'question' as const
export const CONDITION_VARIABLE_TYPE_ANSWER_OPTION = 'answerOption' as const
export const CONDITION_VARIABLE_TYPE_ANSWER_CODE = 'answerCode' as const
export const CONDITION_VARIABLE_TYPE_MATRIX_CELL = 'matrixCell' as const
export const CONDITION_VARIABLE_TYPE_RESPONSE = 'response' as const

export interface ConditionVariable {
  name: string
  type:
    | typeof CONDITION_VARIABLE_TYPE_PARTICIPANT
    | typeof CONDITION_VARIABLE_TYPE_QUESTION
    | typeof CONDITION_VARIABLE_TYPE_ANSWER_OPTION
    | typeof CONDITION_VARIABLE_TYPE_ANSWER_CODE
    | typeof CONDITION_VARIABLE_TYPE_MATRIX_CELL
    | typeof CONDITION_VARIABLE_TYPE_RESPONSE
  questionCode?: string
  answerOptionCode?: string
  subquestionCode?: string
}

export interface ConditionValidationResult {
  isValid: boolean
  errors: string[]
  referencedVariables: ConditionVariable[]
}

export interface AnswerOptionInfo {
  code: string
  label?: string // Localized label text
}

export interface SubquestionInfo {
  code: string
  text?: string
  type: string
}

export interface QuestionInfo {
  code: string
  type: string
  position: number
  text?: string // Localized question text
  detail?: string // Localized question detail/help text
  choiceFormat?: string
  answerOptionCodes?: string[]
  answerOptions?: AnswerOptionInfo[] // Answer options with labels
  subquestions?: SubquestionInfo[] // For matrix questions
  choiceOtherValue?: boolean // Question has an OTHER_VALUE that can be compared
}

/**
 * The minimal group metadata the expression-context builder and the
 * text-expression validator need to resolve/validate `text.<groupCode>`
 * references. `position` is the position of the group's first question, so
 * a group participates in the same forward-reference rule as a question.
 */
export interface GroupInfo {
  code: string
  position: number
  name?: string // Localized group name
  desc?: string // Localized group description
}

// ============================================================================
// Visual Condition Editor Types
// ============================================================================

// ConditionOperandType constants
export const CONDITION_OPERAND_TYPE_QUESTION = 'question' as const
export const CONDITION_OPERAND_TYPE_ANSWER_SELECTED = 'answerSelected' as const
export const CONDITION_OPERAND_TYPE_ANSWER_VALUE = 'answerValue' as const
export const CONDITION_OPERAND_TYPE_ANSWER_OPTION = 'answerOption' as const
export const CONDITION_OPERAND_TYPE_PARTICIPANT = 'participant' as const
export const CONDITION_OPERAND_TYPE_LITERAL = 'literal' as const
export const CONDITION_OPERAND_TYPE_MATRIX_CELL = 'matrixCell' as const
export const CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED =
  'matrixAnswerSelected' as const
export const CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED =
  'multiPartAnswerSelected' as const
export const CONDITION_OPERAND_TYPE_RESPONSE = 'response' as const

/**
 * Types of values in condition expressions
 */
export type ConditionOperandType =
  | typeof CONDITION_OPERAND_TYPE_QUESTION // Q001 - question answer value
  | typeof CONDITION_OPERAND_TYPE_ANSWER_SELECTED // Q001.A002 - boolean option selected
  | typeof CONDITION_OPERAND_TYPE_ANSWER_VALUE // Q001.OTHER_VALUE - sub-field value requiring comparison
  | typeof CONDITION_OPERAND_TYPE_ANSWER_OPTION // "A001" - string literal for answer option
  | typeof CONDITION_OPERAND_TYPE_PARTICIPANT // nameFirst, email, language, custom attributes, etc.
  | typeof CONDITION_OPERAND_TYPE_LITERAL // Custom string, number, or boolean
  | typeof CONDITION_OPERAND_TYPE_MATRIX_CELL // Q001.S001.A001 - specific cell in a matrix question
  | typeof CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED // Q001.S001.A004 - boolean option selected in a specific matrix row
  | typeof CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED // Multi-Part part compared against a predefined value (e.g. Q001.P001 === true)
  | typeof CONDITION_OPERAND_TYPE_RESPONSE // response.language - metadata about the response itself

/**
 * Answer-selected shorthand operand types (e.g. Q001.A002 or Q001.S001.A004) are
 * boolean on their own - no operator/right operand needed to complete the expression.
 * multiPartAnswerSelected is included here too: it bundles question + part +
 * the already-resolved predefined value entirely on the left operand, so it
 * likewise needs no operator/right to complete the expression.
 */
export function isBooleanShorthandOperandType(
  type: ConditionOperandType,
): boolean {
  return (
    type === CONDITION_OPERAND_TYPE_ANSWER_SELECTED ||
    type === CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED ||
    type === CONDITION_OPERAND_TYPE_MULTI_PART_ANSWER_SELECTED
  )
}

/**
 * Operand types that reference a matrix cell (question + subquestion + answer option).
 */
export function isMatrixOperandType(type: ConditionOperandType): boolean {
  return (
    type === CONDITION_OPERAND_TYPE_MATRIX_CELL ||
    type === CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED
  )
}

/**
 * An operand in an expression
 */
export interface ConditionOperand {
  type: ConditionOperandType
  questionCode?: string // For question, answerSelected, matrixCell, matrixAnswerSelected, and multiPartAnswerSelected types
  subquestionCode?: string // For matrixCell, matrixAnswerSelected (subquestion), and multiPartAnswerSelected (part)
  optionCode?: string // For answerSelected, answerOption, matrixCell, and matrixAnswerSelected (answer option)
  participantVar?: string // For participant type
  responseVar?: string // For response type
  literalValue?: string | number | boolean // For literal type, and for multiPartAnswerSelected (the selected predefined value)
}

/**
 * Supported comparison operators
 */
export type ConditionOperator =
  | '===' // equals
  | '!==' // not equals
  | '>' // greater than
  | '>=' // greater than or equal
  | '<' // less than
  | '<=' // less than or equal
  | 'includes' // Array method for select-multiple

/**
 * Logical combinator for combining expressions
 */
export type ConditionCombinator = '&&' | '||'

/**
 * A single condition expression
 */
export interface ConditionExpression {
  id: string // UUID for React keys
  left: ConditionOperand
  operator?: ConditionOperator // Optional for boolean (answerSelected)
  right?: ConditionOperand // Optional for boolean
}

/**
 * A group of expressions (for nesting)
 */
export interface ConditionGroup {
  id: string // UUID for React keys
  items: ConditionNode[] // Expressions or nested groups
  combinator: ConditionCombinator // How items in this group are combined
}

/**
 * A node can be either an expression or a group
 */
export type ConditionNode =
  | { type: 'expression'; expression: ConditionExpression }
  | { type: 'group'; group: ConditionGroup }

/**
 * Root condition tree
 */
export interface ConditionTree {
  root: ConditionGroup // Top-level group containing all conditions
}
