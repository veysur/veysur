import { Survey } from '../model/constructor/Survey'
import { surveyHasFileUpload } from './surveyHasFileUpload'

const makeSurvey = (types: string[]) =>
  new Survey({
    _id: 's1',
    name: 'Test',
    createdById: 'u1',
    title: {},
    attributes: {},
    sections: [{ _id: 'g1', kind: 'group', code: 'G001' }],
    sectionIds: ['g1'],
    elements: types.map((type, i) => ({
      _id: `q${i}`,
      kind: 'question' as const,
      code: `Q00${i}`,
      type,
      sectionId: 'g1',
      text: {},
    })),
    elementIds: types.map((_, i) => `q${i}`),
  })

describe('surveyHasFileUpload', () => {
  test('is true when any question is a file upload', () => {
    expect(surveyHasFileUpload(makeSurvey(['text', 'fileUpload']))).toBe(true)
  })

  test('is false otherwise, including for an empty survey', () => {
    expect(surveyHasFileUpload(makeSurvey(['text', 'number']))).toBe(false)
    expect(surveyHasFileUpload(makeSurvey([]))).toBe(false)
  })
})
