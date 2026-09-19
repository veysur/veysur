import { resolveAnswerLabelValue } from './resolveAnswerLabels'
import { QuestionInfo } from '../SurveyCondition/types'
import {
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
} from '../../constructor/Survey/attributeMeta/types'

const s = (value: unknown) => String(value)

describe('resolveAnswerLabelValue', () => {
  const choice: QuestionInfo = {
    code: 'Q1',
    type: QUESTION_TYPE_CHECKBOX,
    position: 0,
    answerOptionCodes: ['A001', 'A002', 'A003'],
    answerOptions: [
      { code: 'A001', label: 'Blue' },
      { code: 'A002', label: 'Green' },
      { code: 'A003', label: 'Red' },
    ],
  }

  it('joins selected choice labels with ", "', () => {
    const node = resolveAnswerLabelValue(choice, { A001: true, A003: true })
    expect(s(node)).toBe('Blue, Red')
  })

  it('exposes a static option label whether or not selected', () => {
    const node = resolveAnswerLabelValue(choice, { A001: true }) as Record<
      string,
      unknown
    >
    expect(node.A001).toBe('Blue')
    expect(node.A002).toBe('Green')
  })

  it('renders "" for an unanswered choice question', () => {
    expect(s(resolveAnswerLabelValue(choice, undefined))).toBe('')
  })

  it('uses the typed value for an "Other" answer', () => {
    const withOther: QuestionInfo = { ...choice, choiceOtherValue: true }
    const node = resolveAnswerLabelValue(withOther, { OTHER_VALUE: 'custom' })
    expect(s(node)).toBe('custom')
    expect((node as Record<string, unknown>).OTHER_VALUE).toBe('custom')
  })

  it('does not prefix the generic "Other" label when OTHER is also flagged', () => {
    const withOther: QuestionInfo = {
      ...choice,
      choiceOtherValue: true,
      answerOptionCodes: [...choice.answerOptionCodes!, 'OTHER'],
      answerOptions: [
        ...choice.answerOptions!,
        { code: 'OTHER', label: 'Other' },
      ],
    }
    const node = resolveAnswerLabelValue(withOther, {
      A001: true,
      OTHER: true,
      OTHER_VALUE: 'custom',
    })
    expect(s(node)).toBe('Blue, custom')
  })

  it('resolves a yes/no answer to its option label', () => {
    const q: QuestionInfo = {
      code: 'Q2',
      type: QUESTION_TYPE_YES_NO,
      position: 0,
    }
    expect(s(resolveAnswerLabelValue(q, true))).toBe('Yes')
    expect(s(resolveAnswerLabelValue(q, false))).toBe('No')
    expect(s(resolveAnswerLabelValue(q, undefined))).toBe('')
  })

  it('resolves a star rating to the raw number when no per-point label exists', () => {
    const q: QuestionInfo = {
      code: 'Q3',
      type: QUESTION_TYPE_STAR_RATING,
      position: 0,
    }
    expect(s(resolveAnswerLabelValue(q, 4))).toBe('4')
  })

  it('resolves a direct point-scale question via its author caption', () => {
    // Direct point5 questions carry an `answerOptions` collection (P1..P5
    // captions) alongside the predefined scalar options - must not fall
    // through to the choice branch.
    const q: QuestionInfo = {
      code: 'Q019',
      type: QUESTION_TYPE_POINT_5,
      position: 0,
      answerOptions: [
        { code: 'P1', label: 'Very Dissatisfied' },
        { code: 'P2', label: 'Dissatisfied' },
        { code: 'P3', label: 'Neutral' },
        { code: 'P4', label: 'Satisfied' },
        { code: 'P5', label: 'Very Satisfied' },
      ],
    }
    expect(s(resolveAnswerLabelValue(q, 5))).toBe('Very Satisfied')
    // tolerant of a legacy string value
    expect(s(resolveAnswerLabelValue(q, '3'))).toBe('Neutral')
    expect(s(resolveAnswerLabelValue(q, undefined))).toBe('')
    expect((resolveAnswerLabelValue(q, 1) as Record<string, unknown>).P1).toBe(
      'Very Dissatisfied',
    )
  })

  it('returns String(value) for a plain text answer', () => {
    const q: QuestionInfo = {
      code: 'Q4',
      type: QUESTION_TYPE_TEXT,
      position: 0,
    }
    expect(resolveAnswerLabelValue(q, '42')).toBe('42')
    expect(resolveAnswerLabelValue(q, undefined)).toBe('')
  })

  it('renders a matrix as "" whole-question, per-row labels nested', () => {
    const q: QuestionInfo = {
      code: 'Q5',
      type: QUESTION_TYPE_MATRIX_CHECKBOX,
      position: 0,
      answerOptionCodes: ['A001', 'A002'],
      answerOptions: [
        { code: 'A001', label: 'Agree' },
        { code: 'A002', label: 'Disagree' },
      ],
      subquestions: [
        { code: 'S001', type: 'checkbox' },
        { code: 'S002', type: 'checkbox' },
      ],
    }
    const node = resolveAnswerLabelValue(q, {
      S001: { A001: true },
    }) as Record<string, unknown>
    expect(s(node)).toBe('')
    expect(s(node.S001)).toBe('Agree')
    expect(s(node.S002)).toBe('')
    expect((node.S001 as Record<string, unknown>).A001).toBe('Agree')
  })

  it('renders typed matrix cells as their raw value, not the column label', () => {
    const q: QuestionInfo = {
      code: 'Q5b',
      type: QUESTION_TYPE_MATRIX_NUMBER,
      position: 0,
      answerOptionCodes: ['A001', 'A002'],
      answerOptions: [
        { code: 'A001', label: 'Weight' },
        { code: 'A002', label: 'Height' },
      ],
      subquestions: [{ code: 'S001', type: 'number' }],
    }
    const node = resolveAnswerLabelValue(q, {
      S001: { A001: 42, A002: 0 },
    }) as Record<string, unknown>
    // whole row joins the cell values in column order (0 is a real answer)
    expect(s(node.S001)).toBe('42, 0')
    expect((node.S001 as Record<string, unknown>).A001).toBe('42')
    expect((node.S001 as Record<string, unknown>).A002).toBe('0')
  })

  it('renders a matrixText cell as the typed text', () => {
    const q: QuestionInfo = {
      code: 'Q5c',
      type: QUESTION_TYPE_MATRIX_TEXT,
      position: 0,
      answerOptionCodes: ['A001'],
      answerOptions: [{ code: 'A001', label: 'Comment' }],
      subquestions: [{ code: 'S001', type: 'text' }],
    }
    const node = resolveAnswerLabelValue(q, {
      S001: { A001: 'hello world' },
    }) as Record<string, unknown>
    expect(s(node.S001)).toBe('hello world')
    expect((node.S001 as Record<string, unknown>).A001).toBe('hello world')
  })

  it('passes a matrixDate cell through as its stored ISO string', () => {
    const q: QuestionInfo = {
      code: 'Q5d',
      type: QUESTION_TYPE_MATRIX_DATE,
      position: 0,
      answerOptionCodes: ['A001'],
      answerOptions: [{ code: 'A001', label: 'When' }],
      subquestions: [{ code: 'S001', type: 'date' }],
    }
    const node = resolveAnswerLabelValue(q, {
      S001: { A001: '2026-09-07' },
    }) as Record<string, unknown>
    expect((node.S001 as Record<string, unknown>).A001).toBe('2026-09-07')
  })

  it('renders matrixYesNo rows as "Yes" / "No", omitting unanswered cells', () => {
    const q: QuestionInfo = {
      code: 'Q5e',
      type: QUESTION_TYPE_MATRIX_YES_NO,
      position: 0,
      answerOptionCodes: ['A001'],
      answerOptions: [{ code: 'A001', label: 'Applies' }],
      subquestions: [
        { code: 'S001', type: 'yesNo' },
        { code: 'S002', type: 'yesNo' },
        { code: 'S003', type: 'yesNo' },
      ],
    }
    const node = resolveAnswerLabelValue(q, {
      S001: { A001: true },
      S002: { A001: false },
    }) as Record<string, unknown>
    expect(s(node.S001)).toBe('Yes')
    expect(s(node.S002)).toBe('No')
    expect(s(node.S003)).toBe('')
    expect((node.S002 as Record<string, unknown>).A001).toBe('No')
    expect((node.S003 as Record<string, unknown>).A001).toBeUndefined()
  })

  it('renders a matrixComposite with mixed row types per row', () => {
    const q: QuestionInfo = {
      code: 'Q5f',
      type: QUESTION_TYPE_MATRIX_COMPOSITE,
      position: 0,
      answerOptionCodes: ['A001'],
      answerOptions: [{ code: 'A001', label: 'Value' }],
      subquestions: [
        { code: 'S001', type: 'text' },
        { code: 'S002', type: 'yesNo' },
        { code: 'S003', type: 'checkbox' },
      ],
    }
    const node = resolveAnswerLabelValue(q, {
      S001: { A001: 'note' },
      S002: { A001: false },
      S003: { A001: true },
    }) as Record<string, unknown>
    expect(s(node.S001)).toBe('note')
    expect(s(node.S002)).toBe('No')
    expect(s(node.S003)).toBe('Value')
  })

  it('joins multi-part values with ", "', () => {
    const q: QuestionInfo = {
      code: 'Q6',
      type: QUESTION_TYPE_MULTI_PART_TEXT,
      position: 0,
      subquestions: [
        { code: 'P001', type: 'text' },
        { code: 'P002', type: 'text' },
      ],
    }
    const node = resolveAnswerLabelValue(q, { P001: 'x', P002: 3 })
    expect(s(node)).toBe('x, 3')
    expect((node as Record<string, unknown>).P001).toBe('x')
  })

  it('renders multi-part yes/no parts as "Yes" / "No"', () => {
    const q: QuestionInfo = {
      code: 'Q7',
      type: QUESTION_TYPE_MULTI_PART_YES_NO,
      position: 0,
      subquestions: [
        { code: 'P001', type: 'yesNo' },
        { code: 'P002', type: 'yesNo' },
      ],
    }
    const node = resolveAnswerLabelValue(q, { P001: true, P002: false })
    expect(s(node)).toBe('Yes, No')
    expect((node as Record<string, unknown>).P001).toBe('Yes')
    expect((node as Record<string, unknown>).P002).toBe('No')
  })

  it('renders a multi-part star-rating part via its author caption when set', () => {
    const q: QuestionInfo = {
      code: 'Q8',
      type: QUESTION_TYPE_MULTI_PART_STAR_RATING,
      position: 0,
      answerOptions: [
        { code: 'P1', label: 'Poor' },
        { code: 'P2', label: '' },
        { code: 'P4', label: 'Good' },
      ],
      subquestions: [
        { code: 'S001', type: 'starRating' },
        { code: 'S002', type: 'starRating' },
      ],
    }
    const node = resolveAnswerLabelValue(q, { S001: 4, S002: 2 })
    // S001=4 -> author caption "Good"; S002=2 -> no caption -> "2"
    expect(s(node)).toBe('Good, 2')
  })
})
