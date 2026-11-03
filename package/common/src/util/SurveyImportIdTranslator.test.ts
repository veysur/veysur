import { ImportSurveyData } from './ImportSurveyData'
import { SurveyImportIdTranslator } from './SurveyImportIdTranslator'

const noMatch = { findOne: async () => null }

const buildImport = (): ImportSurveyData => ({
  survey: { _id: 'sv1', sectionIds: ['s1'], elementIds: ['q1'] },
  sections: [{ _id: 's1', surveyId: 'sv1', kind: 'group' }],
  elements: [
    {
      _id: 'q1',
      surveyId: 'sv1',
      sectionId: 's1',
      type: 'radio',
      subquestions: [{ _id: 'sq1', code: 'S1' }],
      answerOptions: [{ _id: 'ao1', code: 'A1' }],
    },
  ],
})

describe('SurveyImportIdTranslator', () => {
  const translate = async () => {
    const translator = new SurveyImportIdTranslator({
      surveyRepo: noMatch,
      sectionRepo: noMatch,
      elementRepo: noMatch,
    })
    return (await translator.translate(buildImport())).data
  }

  it('leaves subquestions and answer options with only their own fields', async () => {
    const [element] = (await translate()).elements

    expect(element.subquestions).toEqual([{ _id: 'sq1', code: 'S1' }])
    expect(element.answerOptions).toEqual([{ _id: 'ao1', code: 'A1' }])
  })

  it('does not add elementIds to sections', async () => {
    const [section] = (await translate()).sections

    expect('elementIds' in section).toBe(false)
  })
})
