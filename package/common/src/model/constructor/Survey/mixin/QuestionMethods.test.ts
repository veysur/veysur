import { Survey } from '../../Survey'
import { L10n } from '../../L10n'
import {
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_YES_NO,
  ATTRIBUTE_QUESTION_TYPE,
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  ATTRIBUTE_CHOICE_MIN_MAX,
} from '../attributeMeta'

describe('QuestionMethods', () => {
  let survey: Survey

  beforeEach(() => {
    survey = new Survey({
      _id: '1',
      title: { en: 'Test Survey' },
      createdById: '1',
      sections: [
        {
          _id: 'g1',
          surveyId: '1',
          createdById: '1',
          name: { en: 'Group 1' },
          attributes: {},
        },
        {
          _id: 'g2',
          createdById: '1',
          surveyId: '1',
          name: { en: 'Group 2' },
          attributes: {},
        },
        {
          _id: 'g3',
          createdById: '1',
          surveyId: '1',
          name: { en: 'Group 3' },
          attributes: {},
        },
      ],
      elements: [
        {
          _id: 'q1',
          surveyId: '1',
          sectionId: 'g1',
          createdById: '1',
          text: { en: 'Question 1' },
          attributes: {},
        },
        {
          _id: 'q2',
          surveyId: '1',
          sectionId: 'g1',
          createdById: '1',
          text: { en: 'Question 2' },
          attributes: {},
        },
        {
          _id: 'q3',
          surveyId: '1',
          sectionId: 'g2',
          createdById: '1',
          text: { en: 'Question 3' },
          attributes: {},
        },
        {
          _id: 'q4',
          surveyId: '1',
          sectionId: 'g2',
          createdById: '1',
          text: { en: 'Question 4' },
          attributes: {},
        },
      ],
      sectionIds: ['g1', 'g2', 'g3'],
      elementIds: ['q1', 'q2', 'q3', 'q4'],
    })
  })

  describe('addQuestion', () => {
    test('adds a new question to the end of the group when afterId is not provided', () => {
      const updatedSurvey = survey.addQuestion('g1', {
        text: { en: 'New Question' },
      })
      const groupQuestions = updatedSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')
      expect(groupQuestions.length).toBe(3)
      expect(groupQuestions[2].text.en).toBe('New Question')
    })

    test('adds a new question after the specified question when afterId is provided', () => {
      const updatedSurvey = survey.addQuestion(
        'g1',
        { text: { en: 'New Question' } },
        { afterId: 'q1' },
      )
      const groupQuestions = updatedSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')
      expect(groupQuestions.length).toBe(3)
      expect(groupQuestions[1].text.en).toBe('New Question')
      expect(groupQuestions[2].text.en).toBe('Question 2')
    })

    test('returns a new Survey instance with a new question added to specified question group', () => {
      const newSurvey = new Survey(survey).addQuestion('g1')
      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.elements.questions().length).toBe(5)
      const g1Questions = newSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')
      expect(g1Questions[g1Questions.length - 1].sectionId).toBe('g1')
      expect(survey.elements.questions().length).toBe(4)
    })

    test('keeps the collection and questionIds in group order when the target group is not last', () => {
      // Simulate re-adding a question into a group whose questions were all
      // deleted: g3 is empty and sits after g1/g2.
      const updatedSurvey = survey.addQuestion('g3', {
        _id: 'qNew',
        text: { en: 'New Question' },
      })
      expect(updatedSurvey.elementIds).toEqual(['q1', 'q2', 'q3', 'q4', 'qNew'])
      const positions = [...updatedSurvey.elements.questions()].map(
        (q) => q._id,
      )
      expect(positions).toEqual(['q1', 'q2', 'q3', 'q4', 'qNew'])
    })

    test('positions a question added to an earlier group ahead of later groups', () => {
      const updatedSurvey = survey.addQuestion('g1', {
        _id: 'qNew',
        text: { en: 'New Question' },
      })
      expect([...updatedSurvey.elements.questions()].map((q) => q._id)).toEqual(
        ['q1', 'q2', 'qNew', 'q3', 'q4'],
      )
      expect(updatedSurvey.elementIds).toEqual(['q1', 'q2', 'qNew', 'q3', 'q4'])
    })
  })

  describe('updateQuestion', () => {
    test('returns a new Survey instance with updatedAt question text', () => {
      const newSurvey = new Survey(survey).updateQuestion('q1', {
        text: { en: 'Updated Question 1' },
      })
      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.elements.questions()[0].text.en).toBe(
        'Updated Question 1',
      )
      expect(survey.elements.questions()[0].text.en).toBe('Question 1')
    })
  })

  describe('moveQuestion', () => {
    test('returns a new Survey instance with the question moved to the specified group and position', () => {
      const newSurvey = new Survey(survey).moveQuestion('q1', 'g2', 0)

      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.elements.questions()[1].sectionId).toBe('g2')
      expect(newSurvey.elements.questions()[1]._id).toBe('q1')
      expect(survey.elements.questions()[0].sectionId).toBe('g1')
    })
  })

  describe('deleteQuestion', () => {
    test('returns a new Survey instance with question deletedAt', () => {
      const newSurvey = new Survey(survey).deleteQuestion('q1')
      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.elements.questions().length).toBe(3)
      expect(survey.elements.questions().length).toBe(4)
    })
  })

  describe('moveQuestionUp', () => {
    test('moves question up within the same group', () => {
      const newSurvey = survey.moveQuestionUp('q2')

      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.elements.questions()[0]._id).toBe('q2')
      expect(newSurvey.elements.questions()[1]._id).toBe('q1')
    })

    test('moves question to previous group when at top of current group', () => {
      const newSurvey = survey.moveQuestionUp('q3')

      expect(newSurvey).not.toBe(survey)
      const newQ3 = newSurvey.elements
        .questionList()
        .find((question) => question._id === 'q3')
      expect(newQ3?.sectionId).toBe('g1')
    })

    test('moves question to previous group when globally first but not in first group', () => {
      // Reproduces: Q1 moved into G2, making G1 empty. Q1 is now globally first
      // (questionIds[0]) but should still be moveable up into G1.
      const surveyWithEmptyG1 = new Survey({
        _id: '1',
        title: { en: 'Test Survey' },
        createdById: '1',
        sections: [
          {
            _id: 'g1',
            surveyId: '1',
            createdById: '1',
            name: { en: 'Group 1' },
            attributes: {},
          },
          {
            _id: 'g2',
            createdById: '1',
            surveyId: '1',
            name: { en: 'Group 2' },
            attributes: {},
          },
        ],
        elements: [
          {
            _id: 'q1',
            surveyId: '1',
            sectionId: 'g2',
            createdById: '1',
            text: { en: 'Question 1' },
            attributes: {},
          },
          {
            _id: 'q2',
            surveyId: '1',
            sectionId: 'g2',
            createdById: '1',
            text: { en: 'Question 2' },
            attributes: {},
          },
        ],
        sectionIds: ['g1', 'g2'],
        elementIds: ['q1', 'q2'],
      })

      const newSurvey = surveyWithEmptyG1.moveQuestionUp('q1')

      expect(newSurvey).not.toBe(surveyWithEmptyG1)
      const movedQ1 = newSurvey.elements
        .questionList()
        .find((q) => q._id === 'q1')
      expect(movedQ1?.sectionId).toBe('g1')
    })

    test('does not move question already at the top-most position', () => {
      const newSurvey = survey.moveQuestionUp('q1')

      expect(newSurvey).toBe(survey)
      expect(newSurvey.elements.questions()[0]._id).toBe('q1')
    })

    test('handles non-existent question ID gracefully', () => {
      const newSurvey = survey.moveQuestionUp('non-existent')

      expect(newSurvey).toBe(survey)
      expect(newSurvey.elements.questions().length).toBe(
        survey.elements.questions().length,
      )
      expect(newSurvey.elements.questions()[0]._id).toBe(
        survey.elements.questions()[0]._id,
      )
    })
  })

  describe('moveQuestionDown', () => {
    test('moves question down within the same group', () => {
      const newSurvey = survey.moveQuestionDown('q1')

      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.elements.questions()[0]._id).toBe('q2')
      expect(newSurvey.elements.questions()[1]._id).toBe('q1')
    })

    test('moves question to next group when at bottom of current group', () => {
      const newSurvey = survey.moveQuestionDown('q2')

      expect(newSurvey).not.toBe(survey)
      const newQ2 = newSurvey.elements
        .questionList()
        .find((question) => question._id === 'q2')
      expect(newQ2?.sectionId).toBe('g2')
    })

    test('moves question to next group when at bottom of current group', () => {
      const newSurvey = survey.moveQuestionDown('q4')

      expect(newSurvey).not.toBe(survey)
      const newQ4 = newSurvey.elements
        .questionList()
        .find((question) => question._id === 'q4')
      expect(newQ4?.sectionId).toBe('g3')
    })

    test('does not move question already at the bottom-most position', () => {
      // First move q4 to g3, then try to move it down again
      const surveyWithQ4InG3 = survey.moveQuestionDown('q4')
      const newSurvey = surveyWithQ4InG3.moveQuestionDown('q4')

      expect(newSurvey).toBe(surveyWithQ4InG3)
      const q4 = newSurvey.elements.questionList().find((q) => q._id === 'q4')
      expect(q4?.sectionId).toBe('g3')
    })

    test('handles non-existent question ID gracefully', () => {
      const newSurvey = survey.moveQuestionDown('non-existent')

      expect(newSurvey).toBe(survey)
      expect(newSurvey.elements.questions().length).toBe(
        survey.elements.questions().length,
      )
      expect(newSurvey.elements.questions()[0]._id).toBe(
        survey.elements.questions()[0]._id,
      )
    })
  })

  describe('mutateQuestionAttributes', () => {
    test('updates the specified question attributes', () => {
      const updatedSurvey = new Survey(survey).mutateQuestionAttributes(
        'q1',
        (attributes) => ({
          ...attributes,
          required: 1,
          maxLength: '100',
        }),
      )

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.elements.questions()[0].attributes).toEqual({
        required: 1,
        maxLength: '100',
      })
      expect(survey.elements.questions()[0].attributes).toEqual({
        required: 1,
      })
    })
  })

  describe('setQuestionAttribute', () => {
    test('sets a new attribute for a question', () => {
      const updatedSurvey = new Survey(survey).setQuestionAttribute(
        'q1',
        'custom',
        1,
      )

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.elements.questions()[0].attributes.custom).toBe(1)
      expect(survey.elements.questions()[0].attributes.custom).toBeUndefined()
    })
  })

  describe('Attribute Initialization and Transition', () => {
    describe('addQuestion with default attributes', () => {
      test('initializes text question with default attributes', () => {
        const updatedSurvey = survey.addQuestion('g1', {
          text: { en: 'New Text Question' },
        })

        const newQuestion = updatedSurvey.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        expect(newQuestion.type).toBe(QUESTION_TYPE_TEXT)
        // Entity properties (type, code, condition) are NOT in attributes
        expect(newQuestion.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_TYPE,
        )
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_REQUIRED,
        )
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
        )
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
        )
        expect(newQuestion.attributes[ATTRIBUTE_QUESTION_REQUIRED]).toBe(true)
      })

      test('initializes number question with default attributes', () => {
        const updatedSurvey = survey.addQuestion('g1', {
          text: { en: 'New Number Question' },
          type: QUESTION_TYPE_NUMBER,
        })

        const newQuestion = updatedSurvey.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        expect(newQuestion.type).toBe(QUESTION_TYPE_NUMBER)
        // Entity properties (type, code, condition) are NOT in attributes
        expect(newQuestion.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_TYPE,
        )
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_REQUIRED,
        )
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
        )
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
        )
        expect(newQuestion.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
        )
        expect(
          newQuestion.attributes[ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED],
        ).toBe(false)
      })

      test('initializes checkbox question with default attributes', () => {
        const updatedSurvey = survey.addQuestion('g1', {
          text: { en: 'New Checkbox Question' },
          type: QUESTION_TYPE_CHECKBOX,
        })

        const newQuestion = updatedSurvey.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        expect(newQuestion.type).toBe(QUESTION_TYPE_CHECKBOX)
        // Entity properties (type, code, condition) are NOT in attributes
        expect(newQuestion.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_TYPE,
        )
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_REQUIRED,
        )
        expect(newQuestion.attributes).toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)
        expect(newQuestion.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
        )
        expect(newQuestion.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
        )
      })

      test('allows custom attributes to override defaults', () => {
        const updatedSurvey = survey.addQuestion('g1', {
          text: { en: 'New Question' },
          attributes: {
            [ATTRIBUTE_QUESTION_REQUIRED]: false,
            customAttribute: 'custom value',
          },
        })

        const newQuestion = updatedSurvey.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        expect(newQuestion.attributes[ATTRIBUTE_QUESTION_REQUIRED]).toBe(false)
        expect(newQuestion.attributes.customAttribute).toBe('custom value')
        // Should still have other defaults
        expect(newQuestion.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
        )
      })
    })

    describe('updateQuestion with type transition', () => {
      test('transitions from text to number and updates attributes', () => {
        // First create a text question with custom values
        const surveyWithTextQuestion = survey.addQuestion('g1', {
          text: { en: 'Text Question' },
          type: QUESTION_TYPE_TEXT,
          attributes: {
            [ATTRIBUTE_QUESTION_REQUIRED]: false, // Custom value
            [ATTRIBUTE_QUESTION_INPUT_SIZE]: 'large',
            [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 5, max: 100 },
          },
        })

        const textQuestion = surveyWithTextQuestion.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        const textQuestionId = textQuestion._id

        // Now change type to number
        const surveyWithNumberQuestion = surveyWithTextQuestion.updateQuestion(
          textQuestionId,
          {
            type: QUESTION_TYPE_NUMBER,
          },
        )

        const numberQuestion = surveyWithNumberQuestion.elements
          .questionList()
          .find((q) => q._id === textQuestionId)

        // Should preserve common attributes with custom values
        expect(numberQuestion?.attributes[ATTRIBUTE_QUESTION_REQUIRED]).toBe(
          false,
        )

        // Should remove text-specific attributes
        expect(numberQuestion?.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
        )
        expect(numberQuestion?.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
        )

        // Should add number-specific attributes with defaults
        expect(numberQuestion?.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
        )
        expect(numberQuestion?.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
        )
      })

      test('transitions from number to checkbox and updates attributes', () => {
        // First create a number question with custom values
        const surveyWithNumberQuestion = survey.addQuestion('g1', {
          text: { en: 'Number Question' },
          type: QUESTION_TYPE_NUMBER,
          attributes: {
            [ATTRIBUTE_QUESTION_REQUIRED]: false, // Custom value
            [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 1, max: 10 },
          },
        })

        const numberQuestion = surveyWithNumberQuestion.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        const numberQuestionId = numberQuestion._id

        // Now change type to checkbox
        const surveyWithCheckboxQuestion =
          surveyWithNumberQuestion.updateQuestion(numberQuestionId, {
            type: QUESTION_TYPE_CHECKBOX,
          })

        const checkboxQuestion = surveyWithCheckboxQuestion.elements
          .questionList()
          .find((q) => q._id === numberQuestionId)

        // Should preserve common attributes with custom values
        expect(checkboxQuestion?.attributes[ATTRIBUTE_QUESTION_REQUIRED]).toBe(
          false,
        )

        // Should remove number-specific attributes
        expect(checkboxQuestion?.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
        )
        expect(checkboxQuestion?.attributes).not.toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
        )

        // Should add checkbox-specific attributes with defaults
        expect(checkboxQuestion?.attributes).toHaveProperty(
          ATTRIBUTE_CHOICE_MIN_MAX,
        )
      })

      test('does not transition attributes when type is not changed', () => {
        // Create a text question with custom attributes
        const surveyWithTextQuestion = survey.addQuestion('g1', {
          text: { en: 'Text Question' },
          type: QUESTION_TYPE_TEXT,
          attributes: {
            [ATTRIBUTE_QUESTION_INPUT_SIZE]: 'large',
            [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 5, max: 100 },
          },
        })

        const textQuestion = surveyWithTextQuestion.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        const textQuestionId = textQuestion._id

        // Update text but don't change type
        const updatedSurvey = surveyWithTextQuestion.updateQuestion(
          textQuestionId,
          {
            text: { en: 'Updated Text Question' },
          },
        )

        const updatedQuestion = updatedSurvey.elements
          .questionList()
          .find((q) => q._id === textQuestionId)

        // All attributes should remain unchanged
        expect(updatedQuestion?.attributes[ATTRIBUTE_QUESTION_INPUT_SIZE]).toBe(
          'large',
        )
        expect(
          updatedQuestion?.attributes[ATTRIBUTE_QUESTION_LENGTH_MIN_MAX],
        ).toEqual({ min: 5, max: 100 })
      })

      test('allows custom attributes during type transition', () => {
        const surveyWithTextQuestion = survey.addQuestion('g1', {
          text: { en: 'Text Question' },
          type: QUESTION_TYPE_TEXT,
        })

        const textQuestion = surveyWithTextQuestion.elements
          .questionList()
          .filter((qq) => qq.sectionId === 'g1')[2]
        const textQuestionId = textQuestion._id

        // Change type and provide custom attributes
        const updatedSurvey = surveyWithTextQuestion.updateQuestion(
          textQuestionId,
          {
            type: QUESTION_TYPE_NUMBER,
            attributes: {
              [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: true, // Custom value
            },
          },
        )

        const numberQuestion = updatedSurvey.elements
          .questionList()
          .find((q) => q._id === textQuestionId)

        // Custom attributes should be applied
        expect(
          numberQuestion?.attributes[ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED],
        ).toBe(true)

        // Other defaults should still be present
        expect(numberQuestion?.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
        )
        expect(numberQuestion?.attributes).toHaveProperty(
          ATTRIBUTE_QUESTION_REQUIRED,
        )
      })
    })
  })

  describe('point-scale answerOptions generation', () => {
    test('addQuestion populates 5 empty-label answer options for point5', () => {
      const updatedSurvey = survey.addQuestion('g1', {
        text: { en: 'Rate us' },
        type: QUESTION_TYPE_POINT_5,
      })
      const question = updatedSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]
      expect(question.answerOptions.map((o) => o.code)).toEqual([
        'P1',
        'P2',
        'P3',
        'P4',
        'P5',
      ])
      expect(
        question.answerOptions.every((o) => o.label.getLang('en') === ''),
      ).toBe(true)
    })

    test('addQuestion populates 10 answer options for point10', () => {
      const updatedSurvey = survey.addQuestion('g1', {
        text: { en: 'Rate us' },
        type: QUESTION_TYPE_POINT_10,
      })
      const question = updatedSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]
      expect(question.answerOptions.length).toBe(10)
      expect(question.answerOptions[9].code).toBe('P10')
    })

    test('addQuestion populates 5 answer options for starRating', () => {
      const updatedSurvey = survey.addQuestion('g1', {
        text: { en: 'Rate us' },
        type: QUESTION_TYPE_STAR_RATING,
      })
      const question = updatedSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]
      expect(question.answerOptions.length).toBe(5)
    })

    test('addQuestion does not populate answerOptions for yesNo (out of scope)', () => {
      const updatedSurvey = survey.addQuestion('g1', {
        text: { en: 'Agree?' },
        type: QUESTION_TYPE_YES_NO,
      })
      const question = updatedSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]
      expect(question.answerOptions.length).toBe(0)
    })

    test('addQuestion does not overwrite explicitly-supplied answerOptions', () => {
      const updatedSurvey = survey.addQuestion('g1', {
        text: { en: 'Rate us' },
        type: QUESTION_TYPE_POINT_5,
        answerOptions: [
          { code: 'P1', label: new L10n({ en: 'Custom' }), createdById: '1' },
        ],
      })
      const question = updatedSurvey.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]
      expect(question.answerOptions.length).toBe(1)
      expect(question.answerOptions[0].label.getLang('en')).toBe('Custom')
    })

    test('updateQuestion regenerates answerOptions when switching to point10', () => {
      const surveyWithQuestion = survey.addQuestion('g1', {
        text: { en: 'Q' },
        type: QUESTION_TYPE_TEXT,
      })
      const questionId = surveyWithQuestion.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]._id

      const updatedSurvey = surveyWithQuestion.updateQuestion(questionId, {
        type: QUESTION_TYPE_POINT_10,
      })
      const question = updatedSurvey.elements
        .questionList()
        .find((q) => q._id === questionId)
      expect(question?.answerOptions.length).toBe(10)
    })

    test('updateQuestion fully regenerates answerOptions when switching point5 -> point10 (no stale merge)', () => {
      const surveyWithQuestion = survey.addQuestion('g1', {
        text: { en: 'Q' },
        type: QUESTION_TYPE_POINT_5,
      })
      const question5 = surveyWithQuestion.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]
      const questionId = question5._id
      const surveyWithLabel = surveyWithQuestion.mutateQuestion(
        questionId,
        (q) =>
          q.mutateAnswerOption(q.answerOptions[0]._id, (a) =>
            a.updateLabel('Strongly disagree', 'en', 'en'),
          ),
      )

      const updatedSurvey = surveyWithLabel.updateQuestion(questionId, {
        type: QUESTION_TYPE_POINT_10,
      })
      const question = updatedSurvey.elements
        .questionList()
        .find((q) => q._id === questionId)
      expect(question?.answerOptions.length).toBe(10)
      // Labels reset - do not carry stale labels across a count/affordance change
      expect(question?.answerOptions[0].label.getLang('en')).toBe('')
    })

    test('updateQuestion resets labels when switching between same-count point-scale types', () => {
      const surveyWithQuestion = survey.addQuestion('g1', {
        text: { en: 'Q' },
        type: QUESTION_TYPE_POINT_5,
      })
      const question5 = surveyWithQuestion.elements
        .questionList()
        .filter((qq) => qq.sectionId === 'g1')[2]
      const questionId = question5._id
      const surveyWithLabel = surveyWithQuestion.mutateQuestion(
        questionId,
        (q) =>
          q.mutateAnswerOption(q.answerOptions[0]._id, (a) =>
            a.updateLabel('Strongly disagree', 'en', 'en'),
          ),
      )

      const updatedSurvey = surveyWithLabel.updateQuestion(questionId, {
        type: QUESTION_TYPE_STAR_RATING,
      })
      const question = updatedSurvey.elements
        .questionList()
        .find((q) => q._id === questionId)
      expect(question?.answerOptions.length).toBe(5)
      expect(question?.answerOptions[0].label.getLang('en')).toBe('')
    })
  })
})
