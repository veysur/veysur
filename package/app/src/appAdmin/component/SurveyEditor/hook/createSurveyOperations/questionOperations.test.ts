import { Survey, L10n, Patch } from 'veysur-common'
import {
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
} from 'veysur-common'
import { createQuestionOperations } from './questionOperations'
import { SURVEY_ENTITY_TYPE_ELEMENT } from '../../constant'

describe('Question Operations - Attribute Management', () => {
  let survey: Survey
  let patchBuffer: Patch[]
  let surveyState: Survey
  let operations: ReturnType<typeof createQuestionOperations>

  beforeEach(() => {
    // Create a test survey with one group
    survey = new Survey({
      _id: 'survey1',
      createdById: 'user1',
      title: { en: 'Test Survey' },
      sections: [
        {
          _id: 'g1',
          surveyId: 'survey1',
          createdById: 'user1',
          name: { en: 'Group 1' },
          attributes: {},
        },
      ],
      sectionIds: ['g1'],
    })

    surveyState = survey
    patchBuffer = []

    const updateSurveyState = (updater: (s: Survey) => Survey) => {
      surveyState = updater(surveyState)
    }

    const bufferPatches = (patches: Patch[]) => {
      patchBuffer.push(...patches)
    }

    const setSurveyFocus = jest.fn()

    // validateAndBuffer just calls bufferPatches directly in tests (no validation)
    const validateAndBuffer = ({ patches }: { patches: Patch[] }) => {
      bufferPatches(patches)
    }

    operations = createQuestionOperations({
      updateSurveyState,
      bufferPatches,
      setSurveyFocus,
      validateAndBuffer,
    })
  })

  describe('addQuestion', () => {
    test('creates question with default attributes and buffers them in patch', () => {
      // Generate a question ID
      const questionId = Survey.genElementId()

      // Mock genQuestionId to return our ID
      jest.spyOn(Survey, 'genElementId').mockReturnValue(questionId)

      operations.addQuestion('g1')

      // Verify the question was created with default attributes
      const createdQuestion = surveyState.elements.getQuestionById(questionId)
      expect(createdQuestion).toBeDefined()
      expect(createdQuestion?.type).toBe(QUESTION_TYPE_TEXT)
      expect(createdQuestion?.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_REQUIRED,
      )
      expect(createdQuestion?.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_INPUT_SIZE,
      )

      // Verify patches were buffered
      expect(patchBuffer).toHaveLength(2) // Question create + survey update

      // Verify the CREATE patch includes all attributes
      const createPatch = patchBuffer[0]
      expect(createPatch.type).toBe(SURVEY_ENTITY_TYPE_ELEMENT)
      expect(createPatch.action).toBe('create')
      expect(createPatch.id).toBe(questionId)
      expect(createPatch.data!.attributes).toBeDefined()
      expect(createPatch.data!.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_REQUIRED,
      )
      expect(createPatch.data!.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_INPUT_SIZE,
      )
      expect(
        (createPatch.data!.attributes as Record<string, unknown>)[
          ATTRIBUTE_QUESTION_REQUIRED
        ],
      ).toBe(true)

      // Clean up mock
      jest.restoreAllMocks()
    })

    test('creates number question with number-specific attributes', () => {
      const questionId = Survey.genElementId()
      jest.spyOn(Survey, 'genElementId').mockReturnValue(questionId)

      // Manually add a number question through the state
      surveyState = surveyState.addQuestion(
        'g1',
        { _id: questionId, type: QUESTION_TYPE_NUMBER },
        {},
      )

      const createdQuestion = surveyState.elements.getQuestionById(questionId)
      expect(createdQuestion?.type).toBe(QUESTION_TYPE_NUMBER)
      expect(createdQuestion?.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
      )
      expect(createdQuestion?.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
      )
      expect(createdQuestion?.attributes).not.toHaveProperty(
        ATTRIBUTE_QUESTION_INPUT_SIZE,
      )

      jest.restoreAllMocks()
    })
  })

  describe('updateQuestion with type change', () => {
    let questionId: string

    beforeEach(() => {
      // Create a text question first
      questionId = Survey.genElementId()
      surveyState = surveyState.addQuestion('g1', { _id: questionId }, {})
      patchBuffer = [] // Clear patches from setup
    })

    test('transitions attributes and buffers them when changing type from text to number', () => {
      const oldQuestion = surveyState.elements.getQuestionById(questionId)
      expect(oldQuestion?.type).toBe(QUESTION_TYPE_TEXT)

      // Change question type to number
      operations.updateQuestion(questionId, { type: QUESTION_TYPE_NUMBER })

      // Verify the question type changed
      const updatedQuestion = surveyState.elements.getQuestionById(questionId)
      expect(updatedQuestion?.type).toBe(QUESTION_TYPE_NUMBER)

      // Verify attributes were transitioned
      expect(updatedQuestion?.attributes).not.toHaveProperty(
        ATTRIBUTE_QUESTION_INPUT_SIZE,
      )
      expect(updatedQuestion?.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
      )
      expect(updatedQuestion?.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
      )

      // Verify patch was buffered with transitioned attributes
      expect(patchBuffer).toHaveLength(1)
      const updatePatch = patchBuffer[0]
      expect(updatePatch.type).toBe(SURVEY_ENTITY_TYPE_ELEMENT)
      expect(updatePatch.action).toBe('update')
      expect(updatePatch.id).toBe(questionId)
      expect(updatePatch.data!.type).toBe(QUESTION_TYPE_NUMBER)
      expect(updatePatch.data!.attributes).toBeDefined()
      expect(updatePatch.data!.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
      )
      expect(updatePatch.data!.attributes).toHaveProperty(
        ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
      )
      expect(updatePatch.data!.attributes).not.toHaveProperty(
        ATTRIBUTE_QUESTION_INPUT_SIZE,
      )
    })

    test('preserves custom attribute values during type transition', () => {
      // First, set a custom value for the required attribute
      surveyState = surveyState.setQuestionAttribute(
        questionId,
        ATTRIBUTE_QUESTION_REQUIRED,
        false,
      )
      patchBuffer = [] // Clear patches

      // Change question type to number
      operations.updateQuestion(questionId, { type: QUESTION_TYPE_NUMBER })

      const updatedQuestion = surveyState.elements.getQuestionById(questionId)

      // Verify custom value was preserved
      expect(updatedQuestion?.attributes[ATTRIBUTE_QUESTION_REQUIRED]).toBe(
        false,
      )

      // Verify patch includes the preserved custom value
      const updatePatch = patchBuffer[0]
      expect(
        (updatePatch.data!.attributes as Record<string, unknown>)[
          ATTRIBUTE_QUESTION_REQUIRED
        ],
      ).toBe(false)
    })

    test('includes regenerated point-scale answer options in the patch on a 5 -> 10 point change', () => {
      operations.updateQuestion(questionId, { type: QUESTION_TYPE_POINT_5 })
      expect(
        surveyState.elements.getQuestionById(questionId)?.answerOptions,
      ).toHaveLength(5)
      patchBuffer = []

      operations.updateQuestion(questionId, { type: QUESTION_TYPE_POINT_10 })

      const updatedQuestion = surveyState.elements.getQuestionById(questionId)
      expect(updatedQuestion?.answerOptions).toHaveLength(10)

      // The patch must carry the regenerated options, otherwise the server
      // keeps the old 5 options and restores them (with stale labels) on refetch
      const updatePatch = patchBuffer[0]
      const patchedOptions = updatePatch.data!.answerOptions as unknown[]
      expect(patchedOptions).toHaveLength(10)
    })

    test('does not include attributes in patch when type is not changed', () => {
      // Update question text without changing type
      operations.updateQuestion(questionId, {
        text: new L10n({ en: 'Updated text' }),
      })

      const updatePatch = patchBuffer[0]
      expect(updatePatch.data!.text).toEqual({ en: 'Updated text' })
      expect(updatePatch.data!.type).toBeUndefined()
      // attributes should not be in the patch since type didn't change
      expect(updatePatch.data!.attributes).toBeUndefined()
    })

    test('includes attributes when explicitly provided without type change', () => {
      // Update attributes directly without changing type
      operations.updateQuestion(questionId, {
        attributes: {
          [ATTRIBUTE_QUESTION_REQUIRED]: false,
        },
      })

      const updatePatch = patchBuffer[0]
      expect(updatePatch.data!.attributes).toBeDefined()
      expect(
        (updatePatch.data!.attributes as Record<string, unknown>)[
          ATTRIBUTE_QUESTION_REQUIRED
        ],
      ).toBe(false)
    })
  })

  describe('setQuestionAttribute', () => {
    let questionId: string

    beforeEach(() => {
      questionId = Survey.genElementId()
      surveyState = surveyState.addQuestion('g1', { _id: questionId }, {})
      patchBuffer = [] // Clear patches from setup
    })

    test('buffers individual attribute change with dot notation', () => {
      operations.setQuestionAttribute(
        questionId,
        ATTRIBUTE_QUESTION_REQUIRED,
        false,
      )

      expect(patchBuffer).toHaveLength(1)
      const updatePatch = patchBuffer[0]

      expect(updatePatch.type).toBe(SURVEY_ENTITY_TYPE_ELEMENT)
      expect(updatePatch.action).toBe('update')
      expect(updatePatch.id).toBe(questionId)
      // The patch uses dot notation as a string key
      const attrKey = `attributes.${ATTRIBUTE_QUESTION_REQUIRED}`
      expect(Object.keys(updatePatch.data!)).toContain(attrKey)
      expect(updatePatch.data![attrKey]).toBe(false)
    })
  })

  describe('updateQuestionDetail', () => {
    let questionId: string

    beforeEach(() => {
      questionId = Survey.genElementId()
      surveyState = surveyState.addQuestion(
        'g1',
        { _id: questionId, detail: { en: 'Original detail', de: 'Detail DE' } },
        {},
      )
      patchBuffer = []
    })

    test('persists an emptied default-language detail as an empty string, not a removed key', () => {
      operations.updateQuestionDetail(questionId, '', 'en', 'en')

      const detail = surveyState.elements.getQuestionById(questionId)?.detail
      expect(detail?.getLang('en', 'en')).toBe('')

      expect(patchBuffer).toHaveLength(1)
      const patchDetail = patchBuffer[0].data!.detail as Record<string, unknown>
      expect(patchDetail).toHaveProperty('en', '')
    })

    test('sends a null sentinel when clearing a non-default language detail', () => {
      operations.updateQuestionDetail(questionId, '', 'de', 'en')

      expect(patchBuffer).toHaveLength(1)
      const patchDetail = patchBuffer[0].data!.detail as Record<string, unknown>
      expect(patchDetail.de).toBeNull()
      expect(patchDetail.en).toBe('Original detail')
    })
  })
})
