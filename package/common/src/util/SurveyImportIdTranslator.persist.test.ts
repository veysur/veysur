jest.useRealTimers()

import { schemaManager } from '../model/schema-manager'
import {
  SurveyContent,
  SurveyQuestion,
  SurveySection,
} from '../model/constructor'
import { ImportSurveyData } from './ImportSurveyData'
import { SurveyImportIdTranslator } from './SurveyImportIdTranslator'

const noMatch = { findOne: async () => null }
const stamp = { createdById: 'u1' }

/**
 * Regression: translated import data, built into entities the way the
 * persisters do, must pass the persisted section and element schemas. Extra
 * keys the translator adds (`elementIds`, `questionId`) used to be stripped by
 * the constructors and now reach the strict schemas.
 */
describe('imported entities against the persisted schemas', () => {
  const importData: ImportSurveyData = {
    survey: { _id: 'sv1', sectionIds: ['s1'], elementIds: ['q1', 'c1'] },
    sections: [{ _id: 's1', surveyId: 'sv1', kind: 'group', code: 'G001' }],
    elements: [
      {
        _id: 'q1',
        surveyId: 'sv1',
        sectionId: 's1',
        kind: 'question',
        type: 'radio',
        code: 'Q001',
        text: { en: 'Pick one' },
        subquestions: [{ _id: 'sq1', code: 'S001', text: { en: 'Row' } }],
        answerOptions: [{ _id: 'ao1', code: 'A001', label: { en: 'Yes' } }],
      },
      {
        _id: 'c1',
        surveyId: 'sv1',
        sectionId: 's1',
        kind: 'content',
        type: 'contentText',
        code: 'C001',
        text: { en: 'Intro' },
      },
    ],
  } as unknown as ImportSurveyData

  it('validates each section and element without unknown-field errors', async () => {
    const translator = new SurveyImportIdTranslator({
      surveyRepo: noMatch,
      sectionRepo: noMatch,
      elementRepo: noMatch,
    })
    const { data } = await translator.translate(importData)

    const section = new SurveySection({
      ...data.sections[0],
      ...stamp,
    } as ConstructorParameters<typeof SurveySection>[0])
    const sectionResult = await schemaManager
      .getSchema('surveySection')!
      .validate(section)
    expect(sectionResult.errors ?? {}).toEqual({})

    const elementSchema = schemaManager.getSchema('surveyElement')!
    const question = new SurveyQuestion({
      ...data.elements[0],
      ...stamp,
    } as ConstructorParameters<typeof SurveyQuestion>[0])
    const content = new SurveyContent({
      ...data.elements[1],
      ...stamp,
    } as ConstructorParameters<typeof SurveyContent>[0])
    for (const element of [question, content]) {
      const result = await elementSchema.validate(element)
      expect(result.errors ?? {}).toEqual({})
    }
  })
})
