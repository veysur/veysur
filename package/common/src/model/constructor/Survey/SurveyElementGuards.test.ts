import { SurveyContent, isSurveyContent } from './SurveyContent'
import { SurveyQuestion, isSurveyQuestion } from './SurveyQuestion'

describe('survey element type guards', () => {
  const content = new SurveyContent({ _id: 'c1', sectionId: 's1' })
  const question = new SurveyQuestion({ _id: 'q1', sectionId: 's1' })

  test('isSurveyContent narrows a content element', () => {
    expect(isSurveyContent(content)).toBe(true)
    expect(isSurveyContent(question)).toBe(false)
    expect(isSurveyContent(null)).toBe(false)
    expect(isSurveyContent(undefined)).toBe(false)
  })

  test('isSurveyQuestion narrows a question element', () => {
    expect(isSurveyQuestion(question)).toBe(true)
    expect(isSurveyQuestion(content)).toBe(false)
    expect(isSurveyQuestion(null)).toBe(false)
  })

  test('isSurveyQuestion treats a legacy element with no kind as a question', () => {
    expect(isSurveyQuestion({})).toBe(true)
  })

  test('guards work on plain kind-bearing data', () => {
    expect(isSurveyContent({ kind: 'content' })).toBe(true)
    expect(isSurveyQuestion({ kind: 'question' })).toBe(true)
  })
})
