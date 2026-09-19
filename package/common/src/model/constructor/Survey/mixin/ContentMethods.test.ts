import { Survey } from '../../Survey'
import { CONTENT_TYPE_YOUTUBE } from '../SurveyContent'

const baseSurvey = () =>
  new Survey({
    _id: 's1',
    title: { en: 'T' },
    createdById: 'u1',
    sections: [{ _id: 'g1', code: 'G001', kind: 'group', name: { en: 'G' } }],
    sectionIds: ['g1'],
  }).addContent('g1', { _id: 'c1' })

describe('ContentMethods', () => {
  test('addContent appends a content element in section order', () => {
    const survey = baseSurvey()
    expect(survey.contents).toHaveLength(1)
    expect(survey.contents[0]._id).toBe('c1')
    expect(survey.elementIds).toContain('c1')
  })

  test('updateContentText edits the content L10n immutably', () => {
    const survey = baseSurvey()
    const next = survey.updateContentText('c1', 'Hello', 'en')
    expect(next).not.toBe(survey)
    expect(next.contents[0].text.getLang('en')).toBe('Hello')
    expect(survey.contents[0].text.getLang('en')).not.toBe('Hello')
  })

  test('updateContent merges arbitrary content fields', () => {
    const next = baseSurvey().updateContent('c1', {
      type: CONTENT_TYPE_YOUTUBE,
    })
    expect(next.contents[0].type).toBe(CONTENT_TYPE_YOUTUBE)
  })

  test('setContentConfig / updateContentCondition round-trip', () => {
    let survey = baseSurvey().setContentConfig('c1', {
      youtube: { url: 'x', videoId: 'abc', startAt: null },
    })
    expect(survey.contents[0].config?.youtube?.videoId).toBe('abc')

    survey = survey.updateContentCondition('c1', 'Q001 == "yes"')
    expect(survey.contents[0].conditionReferences).toContain('Q001')

    survey = survey.updateContentCondition('c1', null)
    expect(survey.contents[0].condition).toBeNull()
  })

  test('content mutators are a no-op for an unknown / question id', () => {
    const survey = baseSurvey()
    expect(survey.updateContentText('missing', 'x')).toBe(survey)
  })

  test('deleteContent drops the element and its id', () => {
    const next = baseSurvey().deleteContent('c1')
    expect(next.contents).toHaveLength(0)
    expect(next.elementIds).not.toContain('c1')
  })
})
