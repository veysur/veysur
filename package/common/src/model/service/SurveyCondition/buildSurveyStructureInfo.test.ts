// cspell:ignore Farbe Einleitung Blau
import { buildSurveyStructureInfo } from './buildSurveyStructureInfo'
import { Survey } from '../../constructor/Survey'
import { L10n } from '../../constructor/L10n'
import {
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_TEXT,
} from '../../constructor/Survey/attributeMeta/types'

const survey = () =>
  new Survey({
    _id: 's1',
    language: { default: 'en' },
    sections: [
      { _id: 'g1', code: 'G001', name: { en: 'Intro', de: 'Einleitung' } },
      { _id: 'g2', code: 'G002', name: { en: 'Empty' } },
    ],
    elements: [
      {
        _id: 'q1',
        sectionId: 'g1',
        code: 'Q001',
        type: QUESTION_TYPE_CHECKBOX,
        text: { en: 'Colour?', de: 'Farbe?' },
        answerOptions: [
          {
            _id: 'a1',
            code: 'A001',
            label: new L10n({ en: 'Blue', de: 'Blau' }),
          },
        ],
      },
      {
        _id: 'q2',
        sectionId: 'g1',
        code: 'Q002',
        type: QUESTION_TYPE_MATRIX_CHECKBOX,
        subquestions: [{ _id: 's1', code: 'S001', type: QUESTION_TYPE_TEXT }],
        answerOptions: [
          { _id: 'a2', code: 'A001', label: new L10n({ en: 'Agree' }) },
        ],
      },
    ],
  })

describe('buildSurveyStructureInfo', () => {
  it('derives structural fields with no localized text by default', () => {
    const { questionsInfo, groupsInfo } = buildSurveyStructureInfo(survey())

    expect(questionsInfo.map((q) => [q.code, q.position])).toEqual([
      ['Q001', 0],
      ['Q002', 1],
    ])
    expect(questionsInfo[0].answerOptionCodes).toEqual(['A001'])
    expect(questionsInfo[1].subquestions).toEqual([
      { code: 'S001', type: QUESTION_TYPE_TEXT },
    ])
    expect(questionsInfo[0].text).toBeUndefined()
    // Empty groups excluded by default; positions are the first-question index.
    expect(groupsInfo).toEqual([{ code: 'G001', position: 0 }])
  })

  it('layers localized text when a language is given', () => {
    const { questionsInfo, groupsInfo } = buildSurveyStructureInfo(survey(), {
      lang: 'de',
      langDefault: 'en',
    })

    expect(questionsInfo[0].text).toBe('Farbe?')
    expect(questionsInfo[0].answerOptions).toEqual([
      { code: 'A001', label: 'Blau' },
    ])
    expect(questionsInfo[1].subquestions?.[0]).toMatchObject({ code: 'S001' })
    expect(groupsInfo[0].name).toBe('Einleitung')
  })

  it('keeps empty groups when includeEmptyGroups is set', () => {
    const { groupsInfo } = buildSurveyStructureInfo(survey(), {
      includeEmptyGroups: true,
    })

    expect(groupsInfo.map((g) => g.code)).toEqual(['G001', 'G002'])
    // A group with no questions falls back to position 0.
    expect(groupsInfo[1]).toEqual({ code: 'G002', position: 0 })
  })
})
