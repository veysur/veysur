import { Survey } from '../Survey'
describe('Survey', () => {
  let survey: Survey

  beforeEach(() => {
    survey = new Survey({
      _id: '1',
      title: { en: 'Test Survey' },
    })
  })

  test('updateTitle returns a new Survey instance', () => {
    const newSurvey = survey.updateTitle('New Title')
    expect(newSurvey).not.toBe(survey)
    expect(newSurvey.title.en).toBe('New Title')
    expect(survey.title.en).toBe('Test Survey')
  })
})
