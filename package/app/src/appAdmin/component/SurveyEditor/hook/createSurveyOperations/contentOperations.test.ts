import { Survey, Patch } from 'veysur-common'
import { CONTENT_TYPE_TEXT, CONTENT_TYPE_YOUTUBE } from 'veysur-common'

import { createContentOperations } from './contentOperations'
import {
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_CONTENT,
} from '../../constant'

describe('contentOperations', () => {
  let surveyState: Survey
  let patchBuffer: Patch[]
  let setSurveyFocus: jest.Mock
  let operations: ReturnType<typeof createContentOperations>

  beforeEach(() => {
    surveyState = new Survey({
      _id: 'survey1',
      createdById: 'user1',
      title: { en: 'Test Survey' },
      sections: [{ _id: 'g1', code: 'G001', name: { en: 'Group 1' } }],
      sectionIds: ['g1'],
      elements: [
        { _id: 'q1', code: 'Q001', sectionId: 'g1', type: 'text', text: {} },
        { _id: 'q2', code: 'Q002', sectionId: 'g1', type: 'text', text: {} },
      ],
      elementIds: ['q1', 'q2'],
    })
    patchBuffer = []
    setSurveyFocus = jest.fn()

    const updateSurveyState = (updater: (s: Survey) => Survey) => {
      surveyState = updater(surveyState)
    }
    const bufferPatches = (patches: Patch[]) => {
      patchBuffer.push(...patches)
    }
    const validateAndBuffer = ({ patches }: { patches: Patch[] }) => {
      bufferPatches(patches)
    }

    operations = createContentOperations({
      updateSurveyState,
      bufferPatches,
      setSurveyFocus,
      validateAndBuffer,
    })
  })

  describe('addContent', () => {
    it('emits a content CREATE + a survey elementIds UPDATE', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')

      operations.addContent('g1', {
        type: CONTENT_TYPE_TEXT,
        afterId: 'q1',
      })

      expect(patchBuffer).toHaveLength(2)

      const [create, order] = patchBuffer
      expect(create).toMatchObject({
        type: SURVEY_ENTITY_TYPE_CONTENT,
        action: 'create',
        id: 'c1',
      })
      expect(create.data).toMatchObject({
        _id: 'c1',
        kind: 'content',
        type: CONTENT_TYPE_TEXT,
        sectionId: 'g1',
      })
      // structural only — the L10n body is persisted via the language service
      expect(create.data).not.toHaveProperty('text')

      expect(order).toMatchObject({
        type: SURVEY_ENTITY_TYPE_SURVEY,
        action: 'update',
        id: 'survey1',
      })
      expect(order.data).toEqual({ elementIds: ['q1', 'c1', 'q2'] })

      expect(setSurveyFocus).toHaveBeenCalledWith({
        entityType: SURVEY_ENTITY_TYPE_CONTENT,
        id: 'c1',
      })
    })
  })

  describe('updateContentText', () => {
    it('emits exactly one content UPDATE patch', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')
      operations.addContent('g1', { type: CONTENT_TYPE_TEXT })
      patchBuffer = []

      operations.updateContentText('c1', '<p>Hello</p>', 'en')

      expect(patchBuffer).toHaveLength(1)
      expect(patchBuffer[0]).toMatchObject({
        type: SURVEY_ENTITY_TYPE_CONTENT,
        action: 'update',
        id: 'c1',
      })
      expect(surveyState.contents[0].text.en).toBe('<p>Hello</p>')
    })
  })

  describe('setContentYoutubeUrl', () => {
    it('parses the URL into config.youtube and emits one patch', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')
      operations.addContent('g1', { type: CONTENT_TYPE_YOUTUBE })
      patchBuffer = []

      operations.setContentYoutubeUrl('c1', 'https://youtu.be/dQw4w9WgXcQ?t=30')

      expect(patchBuffer).toHaveLength(1)
      expect(surveyState.contents[0].config?.youtube).toMatchObject({
        videoId: 'dQw4w9WgXcQ',
        startAt: 30,
      })
    })
  })

  describe('updateContentType', () => {
    it('emits one content UPDATE with the new type', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')
      operations.addContent('g1', { type: CONTENT_TYPE_TEXT })
      patchBuffer = []

      operations.updateContentType('c1', CONTENT_TYPE_YOUTUBE)

      expect(patchBuffer).toHaveLength(1)
      expect(patchBuffer[0]).toMatchObject({
        type: SURVEY_ENTITY_TYPE_CONTENT,
        action: 'update',
        id: 'c1',
        data: { type: CONTENT_TYPE_YOUTUBE },
      })
      expect(surveyState.contents[0].type).toBe(CONTENT_TYPE_YOUTUBE)
    })

    it('clears config when switching away from YouTube', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')
      operations.addContent('g1', { type: CONTENT_TYPE_YOUTUBE })
      operations.setContentYoutubeUrl('c1', 'https://youtu.be/dQw4w9WgXcQ')
      patchBuffer = []

      operations.updateContentType('c1', CONTENT_TYPE_TEXT)

      expect(patchBuffer[0].data).toEqual({
        type: CONTENT_TYPE_TEXT,
        config: null,
      })
      expect(surveyState.contents[0].config).toBeNull()
    })
  })

  describe('updateContentCode', () => {
    it('emits one content UPDATE with the new code', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')
      operations.addContent('g1', { type: CONTENT_TYPE_TEXT })
      patchBuffer = []

      operations.updateContentCode('c1', 'C009')

      expect(patchBuffer).toHaveLength(1)
      expect(patchBuffer[0]).toMatchObject({
        type: SURVEY_ENTITY_TYPE_CONTENT,
        action: 'update',
        id: 'c1',
        data: { code: 'C009' },
      })
      expect(surveyState.contents[0].code).toBe('C009')
    })
  })

  describe('moveContent', () => {
    it('emits the content sectionId + survey elementIds pair', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')
      operations.addContent('g1', {
        type: CONTENT_TYPE_TEXT,
        afterId: 'q1',
      })
      patchBuffer = []

      // c1 sits at index 1; move it to the front of g1
      operations.moveContent('c1', 'g1', 0)

      expect(patchBuffer).toHaveLength(2)
      expect(patchBuffer[0]).toMatchObject({
        type: SURVEY_ENTITY_TYPE_CONTENT,
        action: 'update',
        id: 'c1',
        data: { sectionId: 'g1' },
      })
      expect(patchBuffer[1]).toMatchObject({
        type: SURVEY_ENTITY_TYPE_SURVEY,
        action: 'update',
        data: { elementIds: ['c1', 'q1', 'q2'] },
      })
    })
  })

  describe('deleteContent', () => {
    it('emits DELETE + survey elementIds UPDATE and clears focus', () => {
      jest.spyOn(Survey, 'genContentId').mockReturnValue('c1')
      operations.addContent('g1', { type: CONTENT_TYPE_TEXT })
      patchBuffer = []
      setSurveyFocus.mockClear()

      operations.deleteContent('c1')

      expect(patchBuffer).toHaveLength(2)
      expect(patchBuffer[0]).toMatchObject({
        type: SURVEY_ENTITY_TYPE_CONTENT,
        action: 'delete',
        id: 'c1',
        data: null,
      })
      expect(patchBuffer[1].data).toEqual({ elementIds: ['q1', 'q2'] })
      expect(setSurveyFocus).toHaveBeenCalledWith(null)
    })
  })
})
