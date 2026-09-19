import {
  buildAnswerLabelVariableEntries,
  buildParticipantVariableEntries,
  buildQuestionVariableEntries,
} from './buildVariableEntries'
import { QuestionInfo } from './types'

describe('buildParticipantVariableEntries', () => {
  it('builds participant.<name> entries with labels', () => {
    const entries = buildParticipantVariableEntries([
      { name: 'email', label: 'Email' },
      { name: 'city' },
    ])
    expect(entries).toEqual([
      { path: 'participant.email', label: 'Email' },
      { path: 'participant.city', label: 'city' },
    ])
  })

  it('returns an empty array for no attributes', () => {
    expect(buildParticipantVariableEntries([])).toEqual([])
  })
})

describe('buildQuestionVariableEntries', () => {
  it('builds a plain answers.<code> entry for a question with no answer options', () => {
    const questions: QuestionInfo[] = [
      { code: 'Q001', type: 'text', position: 0, text: 'Your name' },
    ]
    expect(buildQuestionVariableEntries(questions)).toEqual([
      { path: 'answers.Q001', label: 'Your name' },
    ])
  })

  it('falls back to the question code when no text is given', () => {
    const questions: QuestionInfo[] = [
      { code: 'Q001', type: 'text', position: 0 },
    ]
    expect(buildQuestionVariableEntries(questions)).toEqual([
      { path: 'answers.Q001', label: 'Q001' },
    ])
  })

  it('builds answer-option entries alongside the plain question entry', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q001',
        type: 'checkbox',
        position: 0,
        text: 'Colour',
        answerOptions: [
          { code: 'A001', label: 'Red' },
          { code: 'A002', label: 'Blue' },
        ],
      },
    ]
    expect(buildQuestionVariableEntries(questions)).toEqual([
      { path: 'answers.Q001', label: 'Colour' },
      { path: 'answers.Q001.A001', label: 'Colour — Red' },
      { path: 'answers.Q001.A002', label: 'Colour — Blue' },
    ])
  })

  it('falls back to answerOptionCodes when answerOptions labels are unavailable', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q001',
        type: 'yesNo',
        position: 0,
        text: 'Agree?',
        answerOptionCodes: ['YES', 'NO'],
      },
    ]
    expect(buildQuestionVariableEntries(questions)).toEqual([
      { path: 'answers.Q001', label: 'Agree?' },
      { path: 'answers.Q001.YES', label: 'Agree? — YES' },
      { path: 'answers.Q001.NO', label: 'Agree? — NO' },
    ])
  })

  it('builds matrix cell entries for subquestions x answer options', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q001',
        type: 'matrixComposite',
        position: 0,
        text: 'Rate these',
        answerOptions: [{ code: 'A001', label: 'Good' }],
        subquestions: [{ code: 'S001', text: 'Speed', type: 'radio' }],
      },
    ]
    expect(buildQuestionVariableEntries(questions)).toEqual([
      { path: 'answers.Q001', label: 'Rate these' },
      { path: 'answers.Q001.S001.A001', label: 'Rate these — Speed — Good' },
    ])
  })

  it('builds multi-part entries without an answer-option axis', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q001',
        type: 'multiPartText',
        position: 0,
        text: 'Details',
        subquestions: [{ code: 'P001', text: 'Part 1', type: 'text' }],
      },
    ]
    expect(buildQuestionVariableEntries(questions)).toEqual([
      { path: 'answers.Q001', label: 'Details' },
      { path: 'answers.Q001.P001', label: 'Details — Part 1' },
    ])
  })

  it('returns an empty array for no questions', () => {
    expect(buildQuestionVariableEntries([])).toEqual([])
  })
})

describe('buildAnswerLabelVariableEntries', () => {
  it('labels the whole-question entry neutrally as "answer"', () => {
    const questions: QuestionInfo[] = [
      { code: 'Q004', type: 'number', position: 0, text: 'How many?' },
    ]
    expect(buildAnswerLabelVariableEntries(questions)).toEqual([
      { path: 'answerLabels.Q004', label: 'How many? — answer' },
    ])
  })

  it('emits both row and cell entries for a matrix question', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q005',
        type: 'matrixComposite',
        position: 0,
        text: 'Rate these',
        answerOptions: [
          { code: 'A001', label: 'Good' },
          { code: 'A002', label: 'Bad' },
        ],
        subquestions: [{ code: 'S001', text: 'Speed', type: 'radio' }],
      },
    ]
    expect(buildAnswerLabelVariableEntries(questions)).toEqual([
      { path: 'answerLabels.Q005', label: 'Rate these — answer' },
      { path: 'answerLabels.Q005.S001', label: 'Rate these — Speed (answer)' },
      {
        path: 'answerLabels.Q005.S001.A001',
        label: 'Rate these — Speed — Good (answer)',
      },
      {
        path: 'answerLabels.Q005.S001.A002',
        label: 'Rate these — Speed — Bad (answer)',
      },
    ])
  })

  it('falls back to answerOptionCodes for matrix cell entries', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q006',
        type: 'matrixYesNo',
        position: 0,
        text: 'Agree?',
        answerOptionCodes: ['A001'],
        subquestions: [{ code: 'S001', text: 'Speed', type: 'yesNo' }],
      },
    ]
    expect(buildAnswerLabelVariableEntries(questions)).toEqual([
      { path: 'answerLabels.Q006', label: 'Agree? — answer' },
      { path: 'answerLabels.Q006.S001', label: 'Agree? — Speed (answer)' },
      {
        path: 'answerLabels.Q006.S001.A001',
        label: 'Agree? — Speed — A001 (answer)',
      },
    ])
  })

  it('labels multi-part parts with an "(answer)" suffix', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q007',
        type: 'multiPartText',
        position: 0,
        text: 'Details',
        subquestions: [{ code: 'P001', text: 'Part 1', type: 'text' }],
      },
    ]
    expect(buildAnswerLabelVariableEntries(questions)).toEqual([
      { path: 'answerLabels.Q007', label: 'Details — answer' },
      { path: 'answerLabels.Q007.P001', label: 'Details — Part 1 (answer)' },
    ])
  })

  it('keeps the "(label)" suffix for static choice-option entries', () => {
    const questions: QuestionInfo[] = [
      {
        code: 'Q008',
        type: 'checkbox',
        position: 0,
        text: 'Colour',
        answerOptions: [{ code: 'A001', label: 'Red' }],
      },
    ]
    expect(buildAnswerLabelVariableEntries(questions)).toEqual([
      { path: 'answerLabels.Q008', label: 'Colour — answer' },
      { path: 'answerLabels.Q008.A001', label: 'Colour — Red (label)' },
    ])
  })
})
