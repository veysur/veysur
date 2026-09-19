// cspell:disable
import { Survey } from '../Survey'
import { SettingSurvey } from '../SettingSurvey'
import { SurveyCompare } from '../../service/SurveyCompare'
import { generateSurveyStructuralHash } from '../../../util/generateSurveyHash'
import {
  CONTENT_TYPE_TEXT,
  CONTENT_TYPE_YOUTUBE,
  SurveyContent,
} from './SurveyContent'

const setting = new SettingSurvey({
  language: { default: 'en', options: ['en'] },
})

const baseSurvey = () =>
  new Survey({
    _id: 's1',
    title: { en: 'S' },
    sections: [{ _id: 'g1', code: 'G001', name: { en: 'G1' } }],
    sectionIds: ['g1'],
    elements: [
      {
        _id: 'q1',
        code: 'Q001',
        sectionId: 'g1',
        type: 'text',
        text: { en: 'Q1' },
      },
      {
        _id: 'q2',
        code: 'Q002',
        sectionId: 'g1',
        type: 'text',
        text: { en: 'Q2' },
      },
    ],
    elementIds: ['q1', 'q2'],
  })

describe('SurveyContent hydration', () => {
  test('an element with kind:content hydrates as SurveyContent', () => {
    const survey = new Survey({
      ...baseSurvey(),
      elements: [
        { _id: 'q1', code: 'Q001', sectionId: 'g1', type: 'text', text: {} },
        {
          _id: 'c1',
          code: 'C001',
          kind: 'content',
          sectionId: 'g1',
          type: CONTENT_TYPE_TEXT,
          text: { en: '<p>Intro</p>' },
        },
      ],
      elementIds: ['q1', 'c1'],
    })

    expect(survey.contents).toHaveLength(1)
    expect(survey.contents[0]).toBeInstanceOf(SurveyContent)
    expect(survey.contents[0].code).toBe('C001')
    // survey.elements.questions() still contains it in 1a (mixed collection), but the
    // filtered view excludes it
    expect(survey.elements.questions().map((q) => q.code)).toEqual(['Q001'])
  })

  test('a question with no kind hydrates as kind:question', () => {
    const survey = baseSurvey()
    expect(survey.elements.questions().getByCode('Q001')?.kind).toBe('question')
    expect(survey.contents).toHaveLength(0)
  })

  test('elements/sections are the raw stores; questions/groups are filtered views', () => {
    const survey = new Survey({
      _id: 's1',
      createdById: 'u1',
      sections: [
        { _id: 'g1', surveyId: 's1', name: { en: 'G1' }, attributes: {} },
      ],
      elements: [
        {
          _id: 'q1',
          surveyId: 's1',
          sectionId: 'g1',
          text: { en: 'Q1' },
          attributes: {},
        },
        {
          _id: 'c1',
          surveyId: 's1',
          sectionId: 'g1',
          kind: 'content',
          type: CONTENT_TYPE_TEXT,
          text: { en: 'body' },
          attributes: {},
        },
      ],
      sectionIds: ['g1'],
      elementIds: ['q1', 'c1'],
    })
    // raw element store carries both kinds
    expect(survey.elements.map((e) => e._id)).toEqual(['q1', 'c1'])
    expect(survey.elementIds).toEqual(['q1', 'c1'])
    expect(survey.sectionIds).toEqual(['g1'])
    // deprecated filtered views
    expect(survey.elements.questions().map((q) => q._id)).toEqual(['q1'])
    expect(survey.sections.groups().map((g) => g._id)).toEqual(['g1'])
    // questionIds / groupIds alias the canonical id arrays
    expect(survey.elementIds).toEqual(survey.elementIds)
    expect(survey.sectionIds).toEqual(survey.sectionIds)
  })
})

describe('ContentMethods', () => {
  test('addContent inserts into element order and keeps section order', () => {
    const survey = baseSurvey().addContent('g1', {
      type: CONTENT_TYPE_TEXT,
      text: { en: 'body' },
    })
    expect(survey.contents).toHaveLength(1)
    const c = survey.contents[0]
    expect(c.code).toBe('C001')
    expect(c.sectionId).toBe('g1')
    expect(survey.elementIds).toContain(c._id)
    expect(survey.elementIds).toHaveLength(3)
  })

  test('addContent afterId places it directly after the target', () => {
    const survey = baseSurvey().addContent(
      'g1',
      { type: CONTENT_TYPE_TEXT },
      { afterId: 'q1' },
    )
    const order = survey.elements.map((e) => e.code)
    expect(order).toEqual(['Q001', 'C001', 'Q002'])
  })

  test('updateContentText shallow-merges L10n', () => {
    let survey = baseSurvey().addContent('g1', {
      type: CONTENT_TYPE_TEXT,
      text: { en: 'a', de: 'b' },
    })
    const id = survey.contents[0]._id
    survey = survey.updateContentText(id, 'A', 'en')
    const c = survey.contents[0]
    expect(c.text.en).toBe('A')
    expect(c.text.de).toBe('b')
  })

  test('setContentConfig stores youtube config', () => {
    let survey = baseSurvey().addContent('g1', {
      type: CONTENT_TYPE_YOUTUBE,
    })
    const id = survey.contents[0]._id
    survey = survey.setContentConfig(id, {
      youtube: { url: 'https://youtu.be/abc', videoId: 'abc' },
    })
    expect(survey.contents[0].config?.youtube?.videoId).toBe('abc')
  })

  test('deleteContent removes it from elements and element order', () => {
    let survey = baseSurvey().addContent('g1', {
      type: CONTENT_TYPE_TEXT,
    })
    const id = survey.contents[0]._id
    survey = survey.deleteContent(id)
    expect(survey.contents).toHaveLength(0)
    expect(survey.elementIds).not.toContain(id)
  })

  test('deleteSection cascades content elements in that section', () => {
    let survey = baseSurvey().addSection({
      _id: 'g2',
      code: 'G002',
      name: { en: 'G2' },
    })
    survey = survey.addContent('g2', { type: CONTENT_TYPE_TEXT })
    expect(survey.contents).toHaveLength(1)
    survey = survey.deleteSection(
      survey.sections.groups().find((g) => g.code === 'G002')!._id,
    )
    expect(survey.contents).toHaveLength(0)
  })

  test('operations return new instances (immutability)', () => {
    const survey = baseSurvey()
    const next = survey.addContent('g1', {
      type: CONTENT_TYPE_TEXT,
    })
    expect(next).not.toBe(survey)
    expect(survey.contents).toHaveLength(0)
  })

  test('moveContent reorders within a section', () => {
    let survey = baseSurvey().addContent(
      'g1',
      { type: CONTENT_TYPE_TEXT },
      { afterId: 'q1' },
    )
    const id = survey.contents[0]._id
    // C001 sits at index 1 (Q001, C001, Q002); move it to the front
    survey = survey.moveContent(id, 'g1', 0)
    expect(survey.elements.map((e) => e.code)).toEqual(['C001', 'Q001', 'Q002'])
  })

  test('moveContent across sections updates sectionId and element order', () => {
    let survey = baseSurvey().addSection({
      _id: 'g2',
      code: 'G002',
      name: { en: 'G2' },
    })
    survey = survey.addContent('g1', { type: CONTENT_TYPE_TEXT })
    const id = survey.contents[0]._id
    survey = survey.moveContent(id, 'g2', 0)
    expect(survey.contents[0].sectionId).toBe('g2')
    // g1 elements come before g2 elements in the flat order
    expect(survey.elements.map((e) => e.code)).toEqual(['Q001', 'Q002', 'C001'])
  })

  test('moveContentUp / Down step past an adjacent question', () => {
    let survey = baseSurvey().addContent('g1', {
      type: CONTENT_TYPE_TEXT,
    })
    const id = survey.contents[0]._id
    // starts last: Q001, Q002, C001
    survey = survey.moveContentUp(id)
    expect(survey.elements.map((e) => e.code)).toEqual(['Q001', 'C001', 'Q002'])
    survey = survey.moveContentDown(id)
    expect(survey.elements.map((e) => e.code)).toEqual(['Q001', 'Q002', 'C001'])
  })
})

describe('structural hash — content elements are first-class', () => {
  const withText = (over = {}) =>
    baseSurvey().addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: CONTENT_TYPE_TEXT,
      text: { en: 'hello' },
      ...over,
    })

  test('adding a content element changes the structural hash', () => {
    expect(generateSurveyStructuralHash(withText(), setting)).not.toBe(
      generateSurveyStructuralHash(baseSurvey(), setting),
    )
  })

  test('changing only the content text does NOT change the structural hash', () => {
    const a = withText({ text: { en: 'hello' } })
    const b = withText({ text: { en: 'goodbye' } })
    expect(generateSurveyStructuralHash(a, setting)).toBe(
      generateSurveyStructuralHash(b, setting),
    )
  })

  test('changing youtube videoId changes the structural hash', () => {
    let a = baseSurvey().addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: CONTENT_TYPE_YOUTUBE,
    })
    let b = a
    a = a.setContentConfig('c1', { youtube: { videoId: 'aaa' } })
    b = b.setContentConfig('c1', { youtube: { videoId: 'bbb' } })
    expect(generateSurveyStructuralHash(a, setting)).not.toBe(
      generateSurveyStructuralHash(b, setting),
    )
  })
})

describe('SurveyCompare — content element diffs', () => {
  const seed = () =>
    baseSurvey().addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: CONTENT_TYPE_TEXT,
      text: { en: 'hello' },
    })

  test('added content element is reported with itemType content', () => {
    const result = new SurveyCompare().compare(baseSurvey(), seed())
    const diff = result.differences.collections.find(
      (d) => d.itemType === 'content',
    )
    expect(diff?.type).toBe('added')
    expect(diff?.itemId).toBe('C001')
  })

  test('removed content element is reported', () => {
    const result = new SurveyCompare().compare(seed(), baseSurvey())
    const diff = result.differences.collections.find(
      (d) => d.itemType === 'content',
    )
    expect(diff?.type).toBe('removed')
  })

  test('content-only change is not equivalent but stays compatible', () => {
    const a = seed()
    const b = a.updateContentText('c1', 'changed', 'en')
    const result = new SurveyCompare().compare(a, b)
    expect(result.isEquivalent).toBe(false)
    expect(result.isCompatible).toBe(true)
  })
})
