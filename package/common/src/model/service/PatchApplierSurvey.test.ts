import { Survey } from 'model'

import {
  PatchApplierSurvey,
  BUFFERED_PATCH_TYPE_SURVEY,
  BUFFERED_PATCH_TYPE_SECTION,
  BUFFERED_PATCH_TYPE_ELEMENT,
} from './PatchApplierSurvey'
import { PatchBuffer } from './PatchBuffer'
import {
  BUFFERED_PATCH_ACTION_CREATE,
  BUFFERED_PATCH_ACTION_UPDATE,
  BUFFERED_PATCH_ACTION_DELETE,
} from './Patcher'

describe('PatchApplierSurvey', () => {
  let survey: Survey
  let buffer: PatchBuffer

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    survey = new Survey({
      _id: 's1',
      title: { en: 'Test Survey' },
      sections: [
        {
          _id: 'g1',
          name: { en: 'Group 1' },
        },
      ],
      elements: [{ _id: 'q1', sectionId: 'g1', text: { en: 'Question 1' } }],
    })
    buffer = new PatchBuffer()
  })

  test('should apply survey update patch', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_SURVEY,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 's1',
      data: { title: { en: 'Updated Survey Title' } },
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.title.en).toBe('Updated Survey Title')
  })

  test('should apply question attribute update patch for textInputSize', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_ELEMENT,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 'q1',
      data: { 'attributes.textInputSize': 'medium' },
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.elements.questions()[0].attributes.textInputSize).toBe(
      'medium',
    )
  })

  test('should apply question group create patch', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_SECTION,
      action: BUFFERED_PATCH_ACTION_CREATE,
      data: { _id: 'g2', name: { en: 'New Group' } },
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.sections.groups()).toHaveLength(2)
    expect(updatedSurvey.sections.groups()[1].name.en).toBe('New Group')
  })

  test('should apply question group update patch', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_SECTION,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 'g1',
      data: { name: { en: 'Updated Group Name' } },
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.sections.groups()[0].name.en).toBe(
      'Updated Group Name',
    )
  })

  test('should apply question group delete patch', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_SECTION,
      action: BUFFERED_PATCH_ACTION_DELETE,
      id: 'g1',
      data: null,
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.sections.groups()).toHaveLength(0)
  })

  test('should apply question create patch', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_ELEMENT,
      action: BUFFERED_PATCH_ACTION_CREATE,
      data: { _id: 'question2', text: { en: 'New Question' }, sectionId: 'g1' },
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.elements.questions()).toHaveLength(2)
    expect(updatedSurvey.elements.questions()[1].text.en).toBe('New Question')
  })

  test('should apply question update patch', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_ELEMENT,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 'q1',
      data: { text: { en: 'Updated Question Text' } },
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.elements.questions()[0].text.en).toBe(
      'Updated Question Text',
    )
  })

  test('should apply question delete patch', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_ELEMENT,
      action: BUFFERED_PATCH_ACTION_DELETE,
      id: 'q1',
      data: null,
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.elements.questions()).toHaveLength(0)
  })

  test('should apply multiple patches in order', () => {
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_SURVEY,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 's1',
      data: { title: { en: 'Updated Survey Title' } },
    })
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_SECTION,
      action: BUFFERED_PATCH_ACTION_CREATE,
      data: { _id: 'g2', name: { en: 'New Group' } },
    })
    buffer = buffer.addPatch({
      type: BUFFERED_PATCH_TYPE_ELEMENT,
      action: BUFFERED_PATCH_ACTION_UPDATE,
      id: 'q1',
      data: { text: { en: 'Updated Question Text' } },
    })

    const updatedSurvey = PatchApplierSurvey.applyPatches(
      buffer.getPatches(),
      survey,
    )
    expect(updatedSurvey.title.en).toBe('Updated Survey Title')
    expect(updatedSurvey.sections.groups()).toHaveLength(2)
    expect(updatedSurvey.sections.groups()[1].name.en).toBe('New Group')
    expect(updatedSurvey.elements.questions()[0].text.en).toBe(
      'Updated Question Text',
    )
  })
})
