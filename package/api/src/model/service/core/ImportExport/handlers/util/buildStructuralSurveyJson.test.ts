import { Survey } from 'veysur-common'

import {
  buildStructuralSurveyJson,
  STRUCTURAL_SURVEY_JSON_VERSION,
} from './buildStructuralSurveyJson'

function makeSurvey(): Survey {
  return new Survey({
    _id: 's1',
    createdById: 'u1',
    name: 'Test Survey',
    title: { en: 'My Survey' },
    sections: [
      {
        _id: 'WELCOME',
        surveyId: 's1',
        createdById: 'u1',
        code: 'WELCOME',
        kind: 'welcome',
        desc: { en: 'Welcome' },
      },
      {
        _id: 'g1',
        surveyId: 's1',
        createdById: 'u1',
        code: 'G001',
        kind: 'group',
        name: { en: 'Group One' },
      },
      {
        _id: 'THANKYOU',
        surveyId: 's1',
        createdById: 'u1',
        code: 'THANKYOU',
        kind: 'thankYou',
        desc: { en: 'Thanks' },
      },
    ],
    sectionIds: ['WELCOME', 'g1', 'THANKYOU'],
    elements: [
      {
        _id: 'q1',
        surveyId: 's1',
        createdById: 'u1',
        type: 'text',
        code: 'Q001',
        sectionId: 'g1',
        text: { en: 'Question One' },
        answerOptions: [],
        subquestions: [],
      },
      {
        _id: 'c1',
        surveyId: 's1',
        createdById: 'u1',
        kind: 'content',
        type: 'contentText',
        code: 'C001',
        sectionId: 'g1',
        text: { en: 'Some intro copy' },
      },
    ],
    elementIds: ['q1', 'c1'],
  })
}

describe('buildStructuralSurveyJson', () => {
  it('emits the 2.0 section/element shape', () => {
    const json = buildStructuralSurveyJson(makeSurvey())

    expect(json.version).toBe(STRUCTURAL_SURVEY_JSON_VERSION)
    expect(json.version).toBe('2.0')
    expect(json.survey.sectionIds).toEqual(['WELCOME', 'g1', 'THANKYOU'])
    expect(json.survey.elementIds).toEqual(['q1', 'c1'])

    expect(json.sections.map((s) => [s.code, s.kind])).toEqual([
      ['WELCOME', 'welcome'],
      ['G001', 'group'],
      ['THANKYOU', 'thankYou'],
    ])

    const q = json.elements.find((e) => e._id === 'q1')
    expect(q).toMatchObject({ kind: 'question', type: 'text', sectionId: 'g1' })
    expect(q).toHaveProperty('subquestions')
    expect(q).toHaveProperty('answerOptions')

    const c = json.elements.find((e) => e._id === 'c1')
    expect(c).toMatchObject({ kind: 'content', type: 'contentText' })
    expect(c).not.toHaveProperty('subquestions')
    expect(c).not.toHaveProperty('answerOptions')
  })

  it('round-trips back into a Survey with the same structure', () => {
    const json = buildStructuralSurveyJson(makeSurvey())

    // JSON round-trip: the wire shape types `kind` as a plain string; the
    // Survey constructor narrows it back.
    const rehydrated = new Survey(
      JSON.parse(
        JSON.stringify({
          ...json.survey,
          sections: json.sections,
          elements: json.elements,
        }),
      ),
    )

    expect(rehydrated.sectionIds).toEqual(['WELCOME', 'g1', 'THANKYOU'])
    expect(rehydrated.elementIds).toEqual(['q1', 'c1'])
    expect(rehydrated.sections.groups().map((s) => s.code)).toEqual(['G001'])
    expect(rehydrated.elements.questions().map((e) => e.code)).toEqual(['Q001'])
    expect(rehydrated.contents.map((c) => c.code)).toEqual(['C001'])
  })
})
