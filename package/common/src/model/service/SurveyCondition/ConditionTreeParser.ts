import {
  ConditionTree,
  ConditionGroup,
  ConditionNode,
  ConditionExpression,
  ConditionOperand,
  ConditionOperator,
  ConditionCombinator,
  CONDITION_OPERAND_TYPE_QUESTION,
  CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_ANSWER_VALUE,
  CONDITION_OPERAND_TYPE_ANSWER_OPTION,
  CONDITION_OPERAND_TYPE_PARTICIPANT,
  CONDITION_OPERAND_TYPE_LITERAL,
  CONDITION_OPERAND_TYPE_MATRIX_CELL,
  CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED,
  CONDITION_OPERAND_TYPE_RESPONSE,
} from './types'

// Token types for the lexer
type TokenType =
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'OPERATOR'
  | 'COMBINATOR'
  | 'LEFT_PAREN'
  | 'RIGHT_PAREN'
  | 'DOT'
  | 'EOF'

interface Token {
  type: TokenType
  value: string
  position: number
}

/**
 * Parses JavaScript condition strings back into ConditionTree structures
 * Returns null if the condition is too complex for the visual editor
 */
export class ConditionTreeParser {
  private static readonly MAX_NESTING_DEPTH = 2
  private tokens: Token[] = []
  private position: number = 0
  private availableAnswerCodes: Set<string> = new Set()

  /**
   * Parse a condition string into a ConditionTree
   * Returns null if the condition cannot be parsed into our model
   *
   * @param condition - The condition string to parse
   * @param availableAnswerCodes - Optional array of known answer codes (e.g., ['A001', 'A002'])
   *                               to distinguish standalone answer codes from question codes
   * @param participantVariableNames - Unused: participant variables are now
   *                               identified purely by the `participant.` prefix;
   *                               accepted for call-site compatibility
   */
  static parse(
    condition: string,
    availableAnswerCodes?: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    participantVariableNames?: Set<string>,
  ): ConditionTree | null {
    if (!condition || condition.trim() === '') {
      return null
    }

    const parser = new ConditionTreeParser()
    if (availableAnswerCodes) {
      parser.availableAnswerCodes = new Set(availableAnswerCodes)
    }
    return parser.parseCondition(condition)
  }

  private parseCondition(condition: string): ConditionTree | null {
    try {
      this.tokens = this.tokenize(condition)
      this.position = 0

      const root = this.parseGroup(0)
      if (!root) {
        return null
      }

      // Ensure we consumed all tokens
      if (this.position < this.tokens.length - 1) {
        // There are unparsed tokens (excluding EOF)
        return null
      }

      return { root }
    } catch {
      return null
    }
  }

  /**
   * Tokenize the condition string
   */
  private tokenize(condition: string): Token[] {
    const tokens: Token[] = []
    let pos = 0
    const input = condition.trim()

    while (pos < input.length) {
      // Skip whitespace
      while (pos < input.length && /\s/.test(input[pos])) {
        pos++
      }

      if (pos >= input.length) break

      const char = input[pos]

      // Parentheses
      if (char === '(') {
        tokens.push({ type: 'LEFT_PAREN', value: '(', position: pos })
        pos++
        continue
      }

      if (char === ')') {
        tokens.push({ type: 'RIGHT_PAREN', value: ')', position: pos })
        pos++
        continue
      }

      // Dot
      if (char === '.') {
        tokens.push({ type: 'DOT', value: '.', position: pos })
        pos++
        continue
      }

      // String literals
      if (char === '"' || char === "'") {
        const quote = char
        let str = ''
        pos++ // skip opening quote
        while (pos < input.length && input[pos] !== quote) {
          if (input[pos] === '\\' && pos + 1 < input.length) {
            str += input[pos + 1]
            pos += 2
          } else {
            str += input[pos]
            pos++
          }
        }
        pos++ // skip closing quote
        tokens.push({ type: 'STRING', value: str, position: pos })
        continue
      }

      // Numbers
      if (
        /[0-9]/.test(char) ||
        (char === '-' && /[0-9]/.test(input[pos + 1]))
      ) {
        let num = ''
        if (char === '-') {
          num = '-'
          pos++
        }
        while (pos < input.length && /[0-9.]/.test(input[pos])) {
          num += input[pos]
          pos++
        }
        tokens.push({ type: 'NUMBER', value: num, position: pos })
        continue
      }

      // Operators and combinators
      // Check multi-character operators first
      const remaining = input.slice(pos)

      if (remaining.startsWith('===')) {
        tokens.push({ type: 'OPERATOR', value: '===', position: pos })
        pos += 3
        continue
      }

      if (remaining.startsWith('!==')) {
        tokens.push({ type: 'OPERATOR', value: '!==', position: pos })
        pos += 3
        continue
      }

      if (remaining.startsWith('>=')) {
        tokens.push({ type: 'OPERATOR', value: '>=', position: pos })
        pos += 2
        continue
      }

      if (remaining.startsWith('<=')) {
        tokens.push({ type: 'OPERATOR', value: '<=', position: pos })
        pos += 2
        continue
      }

      if (remaining.startsWith('&&')) {
        tokens.push({ type: 'COMBINATOR', value: '&&', position: pos })
        pos += 2
        continue
      }

      if (remaining.startsWith('||')) {
        tokens.push({ type: 'COMBINATOR', value: '||', position: pos })
        pos += 2
        continue
      }

      if (char === '>') {
        tokens.push({ type: 'OPERATOR', value: '>', position: pos })
        pos++
        continue
      }

      if (char === '<') {
        tokens.push({ type: 'OPERATOR', value: '<', position: pos })
        pos++
        continue
      }

      // Identifiers (including true/false)
      if (/[A-Za-z_]/.test(char)) {
        let ident = ''
        while (pos < input.length && /[A-Za-z0-9_]/.test(input[pos])) {
          ident += input[pos]
          pos++
        }

        if (ident === 'true' || ident === 'false') {
          tokens.push({ type: 'BOOLEAN', value: ident, position: pos })
        } else if (ident === 'includes') {
          tokens.push({ type: 'OPERATOR', value: 'includes', position: pos })
        } else {
          tokens.push({ type: 'IDENTIFIER', value: ident, position: pos })
        }
        continue
      }

      // Unknown character - skip it
      pos++
    }

    tokens.push({ type: 'EOF', value: '', position: pos })
    return tokens
  }

  /**
   * Get current token
   */
  private current(): Token {
    return this.tokens[this.position] || { type: 'EOF', value: '', position: 0 }
  }

  /**
   * Peek at next token
   */
  private peek(offset: number = 1): Token {
    return (
      this.tokens[this.position + offset] || {
        type: 'EOF',
        value: '',
        position: 0,
      }
    )
  }

  /**
   * Advance to next token
   */
  private advance(): Token {
    const token = this.current()
    this.position++
    return token
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11)
  }

  /**
   * Parse a group of expressions at a given nesting depth
   */
  private parseGroup(depth: number): ConditionGroup | null {
    if (depth > ConditionTreeParser.MAX_NESTING_DEPTH) {
      return null
    }

    const items: ConditionNode[] = []
    let combinator: ConditionCombinator = '&&'
    let firstCombinator: ConditionCombinator | null = null

    while (this.current().type !== 'EOF') {
      // Handle closing parenthesis - end this group
      if (this.current().type === 'RIGHT_PAREN') {
        break
      }

      // Handle opening parenthesis - nested group
      if (this.current().type === 'LEFT_PAREN') {
        this.advance() // consume '('
        const nestedGroup = this.parseGroup(depth + 1)
        if (!nestedGroup) {
          return null
        }
        // Consume closing ')'
        if (this.current().type !== 'RIGHT_PAREN') {
          return null
        }
        this.advance()

        items.push({ type: 'group', group: nestedGroup })
      } else {
        // Parse a single expression
        const expr = this.parseExpression()
        if (!expr) {
          return null
        }
        items.push({ type: 'expression', expression: expr })
      }

      // Check for combinator
      if (this.current().type === 'COMBINATOR') {
        const comb = this.current().value as ConditionCombinator
        this.advance()

        if (firstCombinator === null) {
          firstCombinator = comb
          combinator = comb
        } else if (comb !== firstCombinator) {
          // Mixed combinators at same level - need grouping
          // For now, return null to fall back to code mode
          // A more advanced parser could restructure the tree
          return null
        }
      } else if (
        this.current().type !== 'EOF' &&
        this.current().type !== 'RIGHT_PAREN'
      ) {
        // Unexpected token
        return null
      }
    }

    if (items.length === 0) {
      return null
    }

    return {
      id: this.generateId(),
      items,
      combinator,
    }
  }

  /**
   * Parse a single expression
   */
  private parseExpression(): ConditionExpression | null {
    const left = this.parseOperand()
    if (!left) {
      return null
    }

    // Check if this is a boolean expression (answerSelected with no operator)
    if (
      left.type === CONDITION_OPERAND_TYPE_ANSWER_SELECTED &&
      this.current().type !== 'OPERATOR' &&
      this.current().type !== 'DOT'
    ) {
      return {
        id: this.generateId(),
        left,
      }
    }

    // A matrix cell reference with no trailing operator (e.g. Q001.S001.A004) is a
    // boolean shorthand, mirroring answerSelected above — retype it as
    // matrixAnswerSelected so it round-trips back into the shorthand UI instead of an
    // incomplete matrixCell comparison.
    if (
      left.type === CONDITION_OPERAND_TYPE_MATRIX_CELL &&
      this.current().type !== 'OPERATOR' &&
      this.current().type !== 'DOT'
    ) {
      return {
        id: this.generateId(),
        left: { ...left, type: CONDITION_OPERAND_TYPE_MATRIX_ANSWER_SELECTED },
      }
    }

    // Check for .includes() method call
    if (this.current().type === 'DOT') {
      this.advance() // consume '.'
      if (
        this.current().type === 'OPERATOR' &&
        this.current().value === 'includes'
      ) {
        this.advance() // consume 'includes'

        // Expect '('
        if (this.current().type !== 'LEFT_PAREN') {
          return null
        }
        this.advance()

        // Parse the argument
        const right = this.parseOperand()
        if (!right) {
          return null
        }

        // Expect ')'
        if (this.current().type !== 'RIGHT_PAREN') {
          return null
        }
        this.advance()

        return {
          id: this.generateId(),
          left,
          operator: 'includes',
          right,
        }
      }
      return null
    }

    // Check for operator
    if (this.current().type === 'OPERATOR') {
      const operator = this.current().value as ConditionOperator
      this.advance()

      const right = this.parseOperand()
      if (!right) {
        return null
      }

      // answerSelected followed by an operator is a value comparison (e.g. Q001.OTHER_VALUE === "foo")
      const actualLeft =
        left.type === CONDITION_OPERAND_TYPE_ANSWER_SELECTED
          ? { ...left, type: CONDITION_OPERAND_TYPE_ANSWER_VALUE }
          : left

      return {
        id: this.generateId(),
        left: actualLeft,
        operator,
        right,
      }
    }

    // Expression with just left operand (e.g., a question code used as boolean)
    return {
      id: this.generateId(),
      left,
    }
  }

  /**
   * Parse an operand
   */
  private parseOperand(): ConditionOperand | null {
    const token = this.current()

    if (token.type === 'IDENTIFIER') {
      this.advance()

      // participant.<var> - the participant container root
      if (token.value === 'participant' && this.current().type === 'DOT') {
        this.advance() // consume '.'
        if (this.current().type === 'IDENTIFIER') {
          const participantVar = this.current().value
          this.advance() // consume var name
          return {
            type: CONDITION_OPERAND_TYPE_PARTICIPANT,
            participantVar,
          }
        }
        this.position-- // undo dot consume - malformed, let caller handle
      }

      // response.<var> - the response-metadata container root, kept
      // separate from answers.<questionCode> so the two can never collide
      if (token.value === 'response' && this.current().type === 'DOT') {
        this.advance() // consume '.'
        if (this.current().type === 'IDENTIFIER') {
          const responseVar = this.current().value
          this.advance() // consume var name
          return {
            type: CONDITION_OPERAND_TYPE_RESPONSE,
            responseVar,
          }
        }
        this.position-- // undo dot consume - malformed, let caller handle
      }

      // answers.<questionCode>[.<subquestionCode>].<answerOptionCode> - the
      // answers container root
      if (token.value === 'answers' && this.current().type === 'DOT') {
        this.advance() // consume '.'
        if (this.current().type !== 'IDENTIFIER') {
          this.position-- // undo dot consume - malformed
          return null
        }
        const questionCode = this.current().value
        this.advance() // consume question code

        // Check for dot notation (answers.Q001.A002 or answers.Q001.S001.A001)
        if (this.current().type === 'DOT') {
          this.advance() // consume first '.'

          // Next token should be an identifier (the answer option code, or the
          // subquestion code when a matrix cell's second dot follows)
          if (this.current().type === 'IDENTIFIER') {
            const firstSegmentCode = this.current().value
            // Only treat as answerSelected/matrixCell if the next token is not 'includes' (method call)
            if (firstSegmentCode !== 'includes') {
              this.advance() // consume first segment code

              // Check for second dot → matrix cell (answers.Q001.S001.A001)
              if (this.current().type === 'DOT') {
                this.advance() // consume second '.'
                if (this.current().type === 'IDENTIFIER') {
                  const optionCode = this.current().value
                  this.advance() // consume option code
                  return {
                    type: CONDITION_OPERAND_TYPE_MATRIX_CELL,
                    questionCode,
                    optionCode,
                    subquestionCode: firstSegmentCode,
                  }
                }
                this.position-- // undo second dot consume
              }

              return {
                type: CONDITION_OPERAND_TYPE_ANSWER_SELECTED,
                questionCode,
                optionCode: firstSegmentCode,
              }
            }
            // If it's 'includes', put back the dot position and return as question
          }
          // If we got here with a dot but no valid option code, treat as question
          // and let the caller handle the dot (e.g., for .includes())
          this.position-- // go back before the dot
        }

        return {
          type: CONDITION_OPERAND_TYPE_QUESTION,
          questionCode,
        }
      }

      // Bare identifier - only valid remaining form is an answer-option-code
      // literal (e.g. A001)
      return {
        type: CONDITION_OPERAND_TYPE_ANSWER_OPTION,
        optionCode: token.value,
      }
    }

    if (token.type === 'STRING') {
      this.advance()

      // Only treat as answer option if it's a known answer code (e.g., "A001" stored as string)
      if (this.availableAnswerCodes.has(token.value)) {
        return {
          type: CONDITION_OPERAND_TYPE_ANSWER_OPTION,
          optionCode: token.value,
        }
      }

      // It's a literal string
      return {
        type: CONDITION_OPERAND_TYPE_LITERAL,
        literalValue: token.value,
      }
    }

    if (token.type === 'NUMBER') {
      this.advance()
      return {
        type: CONDITION_OPERAND_TYPE_LITERAL,
        literalValue: parseFloat(token.value),
      }
    }

    if (token.type === 'BOOLEAN') {
      this.advance()
      return {
        type: CONDITION_OPERAND_TYPE_LITERAL,
        literalValue: token.value === 'true',
      }
    }

    return null
  }
}
