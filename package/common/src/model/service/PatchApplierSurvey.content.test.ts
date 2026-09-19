// cspell:disable
import { Survey } from 'model'

import {
  PatchApplierSurvey,
  BUFFERED_PATCH_TYPE_CONTENT,
  BUFFERED_PATCH_TYPE_SURVEY,
  BUFFERED_PATCH_TYPE_ELEMENT,
} from './PatchApplierSurvey'
import { PatchBuffer } from './PatchBuffer'
import {
  BUFFERED_PATCH_ACTION_CREATE,
  BUFFERED_PATCH_ACTION_UPDATE,
  BUFFERED_PATCH_ACTION_DELETE,
} from './Patcher'

describe('PatchApplierSurvey — content', () => {
  let survey: Survey

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    survey = new Survey({
      _id: 's1',
      title: { en: 'Test Survey' },
      sections: [{ _id: 'g1', code: 'G001', name: { en: 'Group 1' } }],
      sectionIds: ['g1'],
      elements: [
        {
          _id: 'q1',
          code: 'Q001',
          sectionId: 'g1',
          text: { en: 'Question 1' },
        },
      ],
      elementIds: ['q1'],
    })
  })

  test('create adds a content element', () => {
    const buffer = new PatchBuffer().addPatch({
      type: BUFFERED_PATCH_TYPE_CONTENT,
      action: BUFFERED_PATCH_ACTION_CREATE,
      id: 'c1',
      data: {
        _id: 'c1',
        code: 'C001',
        kind: 'content',
        type: 'contentText',
        sectionId: 'g1',
        text: { en: '<p>Intro</p>' },
      },
    })
    const result = PatchApplierSurvey.applyPatches(buffer.getPatches(), survey)
    expect(result.contents).toHaveLength(1)
    expect(result.contents[0].code).toBe('C001')
  })

  test('update writes the elements text L10n field, keeping other languages', () => {
    survey = survey.addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      text: { en: 'a', de: 'b' },
    })
    const buffer = new PatchBuffer().addPatch({
      type: BUFFERED_PATCH_TYPE_CONTENT,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 'c1',
      data: { text: { en: 'A' } },
    })
    const result = PatchApplierSurvey.applyPatches(buffer.getPatches(), survey)
    expect(result.contents[0].text.en).toBe('A')
    expect(result.contents[0].text.de).toBe('b')
  })

  test('delete removes the content element', () => {
    survey = survey.addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
    })
    const buffer = new PatchBuffer().addPatch({
      type: BUFFERED_PATCH_TYPE_CONTENT,
      action: BUFFERED_PATCH_ACTION_DELETE,
      id: 'c1',
      data: null,
    })
    const result = PatchApplierSurvey.applyPatches(buffer.getPatches(), survey)
    expect(result.contents).toHaveLength(0)
  })

  test('interleaved question + content batch keeps element order', () => {
    let buffer = new PatchBuffer()
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_CONTENT,
      action: BUFFERED_PATCH_ACTION_CREATE,
      id: 'c1',
      data: {
        _id: 'c1',
        code: 'C001',
        kind: 'content',
        type: 'contentText',
        sectionId: 'g1',
      },
    })
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_ELEMENT,
      action: BUFFERED_PATCH_ACTION_CREATE,
      id: 'q2',
      data: { _id: 'q2', code: 'Q002', sectionId: 'g1', text: { en: 'Q2' } },
    })
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_SURVEY,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 's1',
      data: { elementIds: ['q1', 'q2', 'c1'] },
    })
    const result = PatchApplierSurvey.applyPatches(buffer.getPatches(), survey)
    expect(result.elements.map((e) => e._id)).toEqual(['q1', 'q2', 'c1'])
  })
})
