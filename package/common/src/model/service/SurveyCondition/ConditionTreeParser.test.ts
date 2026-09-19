import { ConditionTreeParser } from './ConditionTreeParser'
import { ConditionGenerator } from './ConditionGenerator'

describe('ConditionTreeParser', () => {
  describe('matrixCell parsing', () => {
    it('should parse triple-dot notation as matrixCell operand', () => {
      const tree = ConditionTreeParser.parse('answers.Q001.S001.A001 === 5')
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('matrixCell')
        expect(expr.expression.left.questionCode).toBe('Q001')
        expect(expr.expression.left.optionCode).toBe('A001')
        expect(expr.expression.left.subquestionCode).toBe('S001')
        expect(expr.expression.operator).toBe('===')
      }
    })

    it('should parse numeric comparison for matrix cell', () => {
      const tree = ConditionTreeParser.parse('answers.Q001.S001.A001 > 100')
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('matrixCell')
        expect(expr.expression.operator).toBe('>')
        expect(expr.expression.right?.type).toBe('literal')
        expect(expr.expression.right?.literalValue).toBe(100)
      }
    })

    it('should parse boolean comparison for matrix cell', () => {
      const tree = ConditionTreeParser.parse('answers.Q001.S002.A002 === true')
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('matrixCell')
        expect(expr.expression.left.subquestionCode).toBe('S002')
        expect(expr.expression.right?.literalValue).toBe(true)
      }
    })

    it('should still parse answers.Q001.A001 as answerSelected (two dots only)', () => {
      const tree = ConditionTreeParser.parse('answers.Q001.A001')
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('answerSelected')
        expect(expr.expression.left.questionCode).toBe('Q001')
        expect(expr.expression.left.optionCode).toBe('A001')
      }
    })

    it('should parse string literal (e.g. "Kevin") as literal, not answerOption', () => {
      const tree = ConditionTreeParser.parse('answers.Q001 === "Kevin"')
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('question')
        expect(expr.expression.operator).toBe('===')
        expect(expr.expression.right?.type).toBe('literal')
        expect(expr.expression.right?.literalValue).toBe('Kevin')
        // Round-trip: should generate answers.Q001 === "Kevin", not answers.Q001.Kevin
        expect(ConditionGenerator.treeToJs(tree!)).toBe(
          'answers.Q001 === "Kevin"',
        )
      }
    })

    it('should parse bare triple-dot notation as matrixAnswerSelected (no operator)', () => {
      const tree = ConditionTreeParser.parse('answers.Q001.S001.A004')
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('matrixAnswerSelected')
        expect(expr.expression.left.questionCode).toBe('Q001')
        expect(expr.expression.left.optionCode).toBe('A004')
        expect(expr.expression.left.subquestionCode).toBe('S001')
        expect(expr.expression.operator).toBeUndefined()
        expect(expr.expression.right).toBeUndefined()
      }
    })

    it('should round-trip matrixAnswerSelected through generator and parser', () => {
      const js = ConditionGenerator.treeToJs({
        root: {
          id: 'g1',
          combinator: '&&',
          items: [
            {
              type: 'expression',
              expression: {
                id: 'e1',
                left: {
                  type: 'matrixAnswerSelected',
                  questionCode: 'Q001',
                  optionCode: 'A004',
                  subquestionCode: 'S001',
                },
              },
            },
          ],
        },
      })
      expect(js).toBe('answers.Q001.S001.A004')

      const reparsed = ConditionTreeParser.parse(js)
      expect(reparsed).not.toBeNull()
      const expr = reparsed!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('matrixAnswerSelected')
        expect(expr.expression.operator).toBeUndefined()
      }
    })

    it('should parse matrix cell mixed with other conditions', () => {
      const tree = ConditionTreeParser.parse(
        'answers.Q001.S001.A001 > 3 && answers.Q002 === "yes"',
      )
      expect(tree).not.toBeNull()
      expect(tree!.root.items).toHaveLength(2)
      expect(tree!.root.combinator).toBe('&&')

      const first = tree!.root.items[0]
      if (first.type === 'expression') {
        expect(first.expression.left.type).toBe('matrixCell')
      }

      const second = tree!.root.items[1]
      if (second.type === 'expression') {
        expect(second.expression.left.type).toBe('question')
      }
    })
  })

  describe('participant variable parsing', () => {
    it('should parse participant.<var> as a participant operand', () => {
      const tree = ConditionTreeParser.parse(
        'participant.email === "test@example.com"',
      )
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('participant')
        expect(expr.expression.left.participantVar).toBe('email')
      }
    })
  })

  describe('response variable parsing', () => {
    it('should parse response.<var> as a response operand, distinct from participant', () => {
      const tree = ConditionTreeParser.parse('response.language === "zh"')
      expect(tree).not.toBeNull()
      const expr = tree!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('response')
        expect(expr.expression.left.responseVar).toBe('language')
      }
    })

    it('should round-trip response.language through generator and parser', () => {
      const js = ConditionGenerator.treeToJs({
        root: {
          id: 'g1',
          combinator: '&&',
          items: [
            {
              type: 'expression',
              expression: {
                id: 'e1',
                left: { type: 'response', responseVar: 'language' },
                operator: '===',
                right: { type: 'literal', literalValue: 'zh' },
              },
            },
          ],
        },
      })
      expect(js).toBe('response.language === "zh"')

      const reparsed = ConditionTreeParser.parse(js)
      expect(reparsed).not.toBeNull()
      const expr = reparsed!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('response')
        expect(expr.expression.left.responseVar).toBe('language')
      }
    })
  })

  describe('answers question round-trip', () => {
    it('should round-trip answers.<questionCode> through generator and parser', () => {
      const js = ConditionGenerator.treeToJs({
        root: {
          id: 'g1',
          combinator: '&&',
          items: [
            {
              type: 'expression',
              expression: {
                id: 'e1',
                left: { type: 'question', questionCode: 'Q001' },
                operator: '>',
                right: { type: 'literal', literalValue: 5 },
              },
            },
          ],
        },
      })
      expect(js).toBe('answers.Q001 > 5')

      const reparsed = ConditionTreeParser.parse(js)
      expect(reparsed).not.toBeNull()
      const expr = reparsed!.root.items[0]
      expect(expr.type).toBe('expression')
      if (expr.type === 'expression') {
        expect(expr.expression.left.type).toBe('question')
        expect(expr.expression.left.questionCode).toBe('Q001')
        expect(expr.expression.operator).toBe('>')
      }
    })
  })
})
