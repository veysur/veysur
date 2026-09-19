import { ConditionGenerator } from './ConditionGenerator'
import {
  ConditionExpression,
  ConditionGroup,
  ConditionNode,
  ConditionOperand,
  ConditionOperator,
  ConditionTree,
} from './types'

describe('ConditionGenerator', () => {
  // Helper to create a complete expression
  const createExpression = (
    left: ConditionOperand,
    operator?: ConditionOperator,
    right?: ConditionOperand,
  ): ConditionExpression => ({
    id: 'test-id',
    left,
    operator,
    right,
  })

  // Helper to create a group
  const createGroup = (
    items: ConditionNode[],
    combinator: '&&' | '||' = '&&',
  ): ConditionGroup => ({
    id: 'test-group',
    items,
    combinator,
  })

  // Helper to wrap expression in node
  const exprNode = (expr: ConditionExpression): ConditionNode => ({
    type: 'expression',
    expression: expr,
  })

  // Helper to wrap group in node
  const groupNode = (group: ConditionGroup): ConditionNode => ({
    type: 'group',
    group,
  })

  describe('isOperandEmpty', () => {
    it('should return true for question operand without questionCode', () => {
      expect(ConditionGenerator.isOperandEmpty({ type: 'question' })).toBe(true)
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'question',
          questionCode: '',
        }),
      ).toBe(true)
    })

    it('should return false for question operand with questionCode', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'question',
          questionCode: 'Q001',
        }),
      ).toBe(false)
    })

    it('should return true for answerSelected operand without complete data', () => {
      expect(
        ConditionGenerator.isOperandEmpty({ type: 'answerSelected' }),
      ).toBe(true)
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'answerSelected',
          questionCode: 'Q001',
        }),
      ).toBe(true)
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'answerSelected',
          optionCode: 'A001',
        }),
      ).toBe(true)
    })

    it('should return false for answerSelected operand with complete data', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'answerSelected',
          questionCode: 'Q001',
          optionCode: 'A001',
        }),
      ).toBe(false)
    })

    it('should return true for answerOption operand without optionCode', () => {
      expect(ConditionGenerator.isOperandEmpty({ type: 'answerOption' })).toBe(
        true,
      )
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'answerOption',
          optionCode: '',
        }),
      ).toBe(true)
    })

    it('should return false for answerOption operand with optionCode', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'answerOption',
          optionCode: 'A001',
        }),
      ).toBe(false)
    })

    it('should return true for participant operand without participantVar', () => {
      expect(ConditionGenerator.isOperandEmpty({ type: 'participant' })).toBe(
        true,
      )
    })

    it('should return false for participant operand with participantVar', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'participant',
          participantVar: 'email',
        }),
      ).toBe(false)
    })

    it('should return true for response operand without responseVar', () => {
      expect(ConditionGenerator.isOperandEmpty({ type: 'response' })).toBe(true)
    })

    it('should return false for response operand with responseVar', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'response',
          responseVar: 'language',
        }),
      ).toBe(false)
    })

    it('should return true for literal operand without value', () => {
      expect(ConditionGenerator.isOperandEmpty({ type: 'literal' })).toBe(true)
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'literal',
          literalValue: '',
        }),
      ).toBe(true)
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'literal',
          literalValue: undefined,
        }),
      ).toBe(true)
    })

    it('should return false for literal operand with value', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'literal',
          literalValue: 'test',
        }),
      ).toBe(false)
      expect(
        ConditionGenerator.isOperandEmpty({ type: 'literal', literalValue: 0 }),
      ).toBe(false)
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'literal',
          literalValue: false,
        }),
      ).toBe(false)
    })
  })

  describe('isExpressionComplete', () => {
    it('should return false for empty question expression', () => {
      const expr = createExpression({ type: 'question' })
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(false)
    })

    it('should return false for question expression without operator', () => {
      const expr = createExpression({ type: 'question', questionCode: 'Q001' })
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(false)
    })

    it('should return false for question expression without right operand', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        '===',
      )
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(false)
    })

    it('should return true for complete question expression', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        '===',
        { type: 'answerOption', optionCode: 'A001' },
      )
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(true)
    })

    it('should return false for empty answerSelected expression', () => {
      const expr = createExpression({ type: 'answerSelected' })
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(false)
    })

    it('should return false for incomplete answerSelected expression', () => {
      const expr = createExpression({
        type: 'answerSelected',
        questionCode: 'Q001',
      })
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(false)
    })

    it('should return true for complete answerSelected expression (no operator needed)', () => {
      const expr = createExpression({
        type: 'answerSelected',
        questionCode: 'Q001',
        optionCode: 'A001',
      })
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(true)
    })

    it('should return false when right operand is empty', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        '===',
        { type: 'literal' },
      )
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(false)
    })
  })

  describe('nodeToJs', () => {
    it('should return null for incomplete expression', () => {
      const node = exprNode(createExpression({ type: 'question' }))
      expect(ConditionGenerator.nodeToJs(node)).toBe(null)
    })

    it('should return null for partial expression without operator', () => {
      const node = exprNode(
        createExpression({ type: 'question', questionCode: 'Q001' }),
      )
      expect(ConditionGenerator.nodeToJs(node)).toBe(null)
    })

    it('should return JavaScript for complete expression', () => {
      const node = exprNode(
        createExpression({ type: 'question', questionCode: 'Q001' }, '===', {
          type: 'answerOption',
          optionCode: 'A001',
        }),
      )
      // Question to answerOption comparisons use dot notation since multiple choice returns objects
      expect(ConditionGenerator.nodeToJs(node)).toBe('answers.Q001.A001')
    })

    it('should return JavaScript for complete answerSelected expression', () => {
      const node = exprNode(
        createExpression({
          type: 'answerSelected',
          questionCode: 'Q001',
          optionCode: 'A002',
        }),
      )
      // Now uses dot notation for object property access
      expect(ConditionGenerator.nodeToJs(node)).toBe('answers.Q001.A002')
    })
  })

  describe('groupToJs', () => {
    it('should return empty string for empty group', () => {
      const group = createGroup([])
      expect(ConditionGenerator.groupToJs(group)).toBe('')
    })

    it('should return empty string when all expressions are incomplete', () => {
      const group = createGroup([
        exprNode(createExpression({ type: 'question' })),
        exprNode(createExpression({ type: 'question', questionCode: 'Q001' })),
      ])
      expect(ConditionGenerator.groupToJs(group)).toBe('')
    })

    it('should return only the complete expression', () => {
      const group = createGroup([
        exprNode(createExpression({ type: 'question' })), // incomplete
        exprNode(
          createExpression({ type: 'question', questionCode: 'Q001' }, '===', {
            type: 'answerOption',
            optionCode: 'A001',
          }),
        ), // complete
      ])
      expect(ConditionGenerator.groupToJs(group)).toBe('answers.Q001.A001')
    })

    it('should filter out incomplete expressions and join complete ones', () => {
      const group = createGroup([
        exprNode(createExpression({ type: 'question' })), // incomplete
        exprNode(
          createExpression({ type: 'question', questionCode: 'Q001' }, '===', {
            type: 'answerOption',
            optionCode: 'A001',
          }),
        ), // complete
        exprNode(createExpression({ type: 'question', questionCode: 'Q002' })), // incomplete - no operator
        exprNode(
          createExpression({
            type: 'answerSelected',
            questionCode: 'Q003',
            optionCode: 'A002',
          }),
        ), // complete
      ])
      expect(ConditionGenerator.groupToJs(group)).toBe(
        'answers.Q001.A001 && answers.Q003.A002',
      )
    })

    it('should handle nested groups with incomplete expressions', () => {
      const innerGroup = createGroup([
        exprNode(createExpression({ type: 'question' })), // incomplete
        exprNode(
          createExpression({
            type: 'answerSelected',
            questionCode: 'Q002',
            optionCode: 'A001',
          }),
        ), // complete
      ])

      const outerGroup = createGroup([
        exprNode(
          createExpression({ type: 'question', questionCode: 'Q001' }, '===', {
            type: 'answerOption',
            optionCode: 'A001',
          }),
        ),
        groupNode(innerGroup),
      ])

      expect(ConditionGenerator.groupToJs(outerGroup)).toBe(
        'answers.Q001.A001 && answers.Q002.A001',
      )
    })

    it('should properly wrap nested groups in parentheses', () => {
      const innerGroup = createGroup(
        [
          exprNode(
            createExpression({
              type: 'answerSelected',
              questionCode: 'Q002',
              optionCode: 'A001',
            }),
          ),
          exprNode(
            createExpression({
              type: 'answerSelected',
              questionCode: 'Q003',
              optionCode: 'A002',
            }),
          ),
        ],
        '||',
      )

      const outerGroup = createGroup([
        exprNode(
          createExpression({ type: 'question', questionCode: 'Q001' }, '===', {
            type: 'answerOption',
            optionCode: 'A001',
          }),
        ),
        groupNode(innerGroup),
      ])

      expect(ConditionGenerator.groupToJs(outerGroup)).toBe(
        'answers.Q001.A001 && (answers.Q002.A001 || answers.Q003.A002)',
      )
    })

    it('should return empty string for nested group with all incomplete expressions', () => {
      const innerGroup = createGroup([
        exprNode(createExpression({ type: 'question' })),
        exprNode(createExpression({ type: 'question', questionCode: 'Q002' })),
      ])

      const outerGroup = createGroup([groupNode(innerGroup)])

      expect(ConditionGenerator.groupToJs(outerGroup)).toBe('')
    })
  })

  describe('treeToJs', () => {
    it('should return empty string for tree with no complete expressions', () => {
      const tree: ConditionTree = {
        root: createGroup([exprNode(createExpression({ type: 'question' }))]),
      }
      expect(ConditionGenerator.treeToJs(tree)).toBe('')
    })

    it('should generate valid JavaScript for tree with complete expressions', () => {
      const tree: ConditionTree = {
        root: createGroup([
          exprNode(
            createExpression(
              { type: 'question', questionCode: 'Q001' },
              '===',
              { type: 'answerOption', optionCode: 'A001' },
            ),
          ),
          exprNode(
            createExpression({
              type: 'answerSelected',
              questionCode: 'Q002',
              optionCode: 'A002',
            }),
          ),
        ]),
      }
      expect(ConditionGenerator.treeToJs(tree)).toBe(
        'answers.Q001.A001 && answers.Q002.A002',
      )
    })

    it('should skip incomplete expressions in tree', () => {
      const tree: ConditionTree = {
        root: createGroup([
          exprNode(createExpression({ type: 'question' })), // incomplete
          exprNode(
            createExpression(
              { type: 'question', questionCode: 'Q001' },
              '===',
              { type: 'answerOption', optionCode: 'A001' },
            ),
          ), // complete
          exprNode(
            createExpression({ type: 'question', questionCode: 'Q002' }),
          ), // incomplete - no operator
        ]),
      }
      expect(ConditionGenerator.treeToJs(tree)).toBe('answers.Q001.A001')
    })
  })

  describe('regression tests - complete expressions still work', () => {
    it('should handle participant variable expressions', () => {
      const expr = createExpression(
        { type: 'participant', participantVar: 'email' },
        '===',
        { type: 'literal', literalValue: 'test@example.com' },
      )
      const node = exprNode(expr)
      expect(ConditionGenerator.nodeToJs(node)).toBe(
        'participant.email === "test@example.com"',
      )
    })

    it('should handle response variable expressions', () => {
      const expr = createExpression(
        { type: 'response', responseVar: 'language' },
        '===',
        { type: 'literal', literalValue: 'zh' },
      )
      const node = exprNode(expr)
      expect(ConditionGenerator.nodeToJs(node)).toBe(
        'response.language === "zh"',
      )
    })

    it('should handle includes operator with answer option (converts to dot notation)', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        'includes',
        { type: 'answerOption', optionCode: 'A001' },
      )
      const node = exprNode(expr)
      // Multiple choice answers are objects, so includes converts to dot notation
      expect(ConditionGenerator.nodeToJs(node)).toBe('answers.Q001.A001')
    })

    it('should handle includes operator with literal (keeps method syntax)', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        'includes',
        { type: 'literal', literalValue: 'text' },
      )
      const node = exprNode(expr)
      // String includes still uses method syntax
      expect(ConditionGenerator.nodeToJs(node)).toBe(
        'answers.Q001.includes("text")',
      )
    })

    it('should handle numeric literals', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        '>',
        { type: 'literal', literalValue: 5 },
      )
      const node = exprNode(expr)
      expect(ConditionGenerator.nodeToJs(node)).toBe('answers.Q001 > 5')
    })

    it('should handle boolean literals', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        '===',
        { type: 'literal', literalValue: true },
      )
      const node = exprNode(expr)
      expect(ConditionGenerator.nodeToJs(node)).toBe('answers.Q001 === true')
    })

    it('should handle complex nested groups', () => {
      const tree: ConditionTree = {
        root: createGroup([
          exprNode(
            createExpression(
              { type: 'question', questionCode: 'Q001' },
              '===',
              { type: 'answerOption', optionCode: 'A001' },
            ),
          ),
          groupNode(
            createGroup(
              [
                exprNode(
                  createExpression(
                    { type: 'participant', participantVar: 'language' },
                    '===',
                    { type: 'literal', literalValue: 'en' },
                  ),
                ),
                exprNode(
                  createExpression(
                    { type: 'participant', participantVar: 'language' },
                    '===',
                    { type: 'literal', literalValue: 'fr' },
                  ),
                ),
              ],
              '||',
            ),
          ),
        ]),
      }
      expect(ConditionGenerator.treeToJs(tree)).toBe(
        'answers.Q001.A001 && (participant.language === "en" || participant.language === "fr")',
      )
    })

    it('should use negation for !== comparison with answer option', () => {
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        '!==',
        { type: 'answerOption', optionCode: 'A001' },
      )
      const node = exprNode(expr)
      expect(ConditionGenerator.nodeToJs(node)).toBe('!answers.Q001.A001')
    })

    it('should not convert to includes when comparing with literal', () => {
      // When comparing question with a literal (not answerOption), use standard operators
      const expr = createExpression(
        { type: 'question', questionCode: 'Q001' },
        '===',
        { type: 'literal', literalValue: 'some-value' },
      )
      const node = exprNode(expr)
      expect(ConditionGenerator.nodeToJs(node)).toBe(
        'answers.Q001 === "some-value"',
      )
    })
  })

  describe('matrixCell operand', () => {
    it('should return true for matrixCell operand without questionCode', () => {
      expect(ConditionGenerator.isOperandEmpty({ type: 'matrixCell' })).toBe(
        true,
      )
    })

    it('should return true for matrixCell operand missing optionCode', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'matrixCell',
          questionCode: 'Q001',
          subquestionCode: 'S001',
        }),
      ).toBe(true)
    })

    it('should return true for matrixCell operand missing subquestionCode', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'matrixCell',
          questionCode: 'Q001',
          optionCode: 'A001',
        }),
      ).toBe(true)
    })

    it('should return false for complete matrixCell operand', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'matrixCell',
          questionCode: 'Q001',
          optionCode: 'A001',
          subquestionCode: 'S001',
        }),
      ).toBe(false)
    })

    it('should generate triple-dot notation for matrixCell operand', () => {
      const expr = createExpression(
        {
          type: 'matrixCell',
          questionCode: 'Q001',
          optionCode: 'A001',
          subquestionCode: 'S001',
        },
        '===',
        { type: 'literal', literalValue: 5 },
      )
      expect(ConditionGenerator.nodeToJs(exprNode(expr))).toBe(
        'answers.Q001.S001.A001 === 5',
      )
    })

    it('should generate numeric comparison for matrixCell', () => {
      const tree: ConditionTree = {
        root: createGroup([
          exprNode(
            createExpression(
              {
                type: 'matrixCell',
                questionCode: 'Q001',
                optionCode: 'A002',
                subquestionCode: 'S002',
              },
              '>',
              { type: 'literal', literalValue: 100 },
            ),
          ),
        ]),
      }
      expect(ConditionGenerator.treeToJs(tree)).toBe(
        'answers.Q001.S002.A002 > 100',
      )
    })

    it('should generate boolean comparison for matrixCell', () => {
      const expr = createExpression(
        {
          type: 'matrixCell',
          questionCode: 'Q001',
          optionCode: 'A001',
          subquestionCode: 'S001',
        },
        '===',
        { type: 'literal', literalValue: true },
      )
      expect(ConditionGenerator.nodeToJs(exprNode(expr))).toBe(
        'answers.Q001.S001.A001 === true',
      )
    })

    it('should quote answer-option operand when compared against a matrixCell', () => {
      const expr = createExpression(
        {
          type: 'matrixCell',
          questionCode: 'Q001',
          optionCode: 'A001',
          subquestionCode: 'S001',
        },
        '===',
        { type: 'answerOption', optionCode: 'A001' },
      )
      expect(ConditionGenerator.nodeToJs(exprNode(expr))).toBe(
        'answers.Q001.S001.A001 === "A001"',
      )
    })
  })

  describe('matrixAnswerSelected operand', () => {
    it('should return true for empty matrixAnswerSelected operand', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'matrixAnswerSelected',
          questionCode: 'Q001',
          optionCode: 'A004',
        }),
      ).toBe(true)
    })

    it('should return false for complete matrixAnswerSelected operand', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'matrixAnswerSelected',
          questionCode: 'Q001',
          optionCode: 'A004',
          subquestionCode: 'S001',
        }),
      ).toBe(false)
    })

    it('should be complete without an operator or right operand', () => {
      const expr = createExpression({
        type: 'matrixAnswerSelected',
        questionCode: 'Q001',
        optionCode: 'A004',
        subquestionCode: 'S001',
      })
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(true)
    })

    it('should generate bare triple-dot notation (no operator)', () => {
      const expr = createExpression({
        type: 'matrixAnswerSelected',
        questionCode: 'Q001',
        optionCode: 'A004',
        subquestionCode: 'S001',
      })
      expect(ConditionGenerator.nodeToJs(exprNode(expr))).toBe(
        'answers.Q001.S001.A004',
      )
    })

    it('should generate the same bare notation within a tree', () => {
      const tree: ConditionTree = {
        root: createGroup([
          exprNode(
            createExpression({
              type: 'matrixAnswerSelected',
              questionCode: 'Q001',
              optionCode: 'A004',
              subquestionCode: 'S001',
            }),
          ),
        ]),
      }
      expect(ConditionGenerator.treeToJs(tree)).toBe('answers.Q001.S001.A004')
    })
  })

  describe('multiPartAnswerSelected operand', () => {
    it('should return true for empty multiPartAnswerSelected operand', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'multiPartAnswerSelected',
          questionCode: 'Q001',
          subquestionCode: 'P001',
        }),
      ).toBe(true)
    })

    it('should return false for a complete boolean multiPartAnswerSelected operand', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'multiPartAnswerSelected',
          questionCode: 'Q001',
          subquestionCode: 'P001',
          literalValue: false,
        }),
      ).toBe(false)
    })

    it('should return false for a complete numeric multiPartAnswerSelected operand', () => {
      expect(
        ConditionGenerator.isOperandEmpty({
          type: 'multiPartAnswerSelected',
          questionCode: 'Q001',
          subquestionCode: 'P001',
          literalValue: 7,
        }),
      ).toBe(false)
    })

    it('should be complete without an operator or right operand', () => {
      const expr = createExpression({
        type: 'multiPartAnswerSelected',
        questionCode: 'Q001',
        subquestionCode: 'P001',
        literalValue: true,
      })
      expect(ConditionGenerator.isExpressionComplete(expr)).toBe(true)
    })

    it('should generate a boolean equality comparison', () => {
      const expr = createExpression({
        type: 'multiPartAnswerSelected',
        questionCode: 'Q001',
        subquestionCode: 'P001',
        literalValue: true,
      })
      expect(ConditionGenerator.nodeToJs(exprNode(expr))).toBe(
        'answers.Q001.P001 === true',
      )
    })

    it('should generate a false comparison for the "No" predefined value', () => {
      const expr = createExpression({
        type: 'multiPartAnswerSelected',
        questionCode: 'Q001',
        subquestionCode: 'P001',
        literalValue: false,
      })
      expect(ConditionGenerator.nodeToJs(exprNode(expr))).toBe(
        'answers.Q001.P001 === false',
      )
    })

    it('should generate a numeric equality comparison for a Star/Point part', () => {
      const expr = createExpression({
        type: 'multiPartAnswerSelected',
        questionCode: 'Q001',
        subquestionCode: 'P001',
        literalValue: 7,
      })
      expect(ConditionGenerator.nodeToJs(exprNode(expr))).toBe(
        'answers.Q001.P001 === 7',
      )
    })

    it('should generate the same notation within a tree', () => {
      const tree: ConditionTree = {
        root: createGroup([
          exprNode(
            createExpression({
              type: 'multiPartAnswerSelected',
              questionCode: 'Q001',
              subquestionCode: 'P001',
              literalValue: false,
            }),
          ),
        ]),
      }
      expect(ConditionGenerator.treeToJs(tree)).toBe(
        'answers.Q001.P001 === false',
      )
    })
  })
})
