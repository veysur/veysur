import { Survey } from '../../Survey'

describe('Survey Core Methods', () => {
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

  describe('questionIds', () => {
    test('initializes questionIds from questions in constructor', () => {
      expect(survey.elementIds).toEqual(['q1', 'q2', 'q3', 'q4'])
    })

    test('uses provided questionIds in constructor if available', () => {
      const customSurvey = new Survey({
        ...survey,
        elementIds: ['q2', 'q1'],
      })

      expect(customSurvey.elementIds).toEqual(['q2', 'q1'])
    })

    test('updates questionIds when adding a question', () => {
      const newSurvey = survey.addQuestion('g1', {
        text: { en: 'New Question' },
      })
      const newQuestionId = newSurvey.elementIds.find(
        (id) => !['q1', 'q2', 'q3', 'q4'].includes(id),
      )

      // The new question is added to g1, so it sits after g1's existing
      // questions (q1, q2) and before g2's (q3, q4) — addQuestion keeps the
      // collection in section order.
      expect(newSurvey.elementIds).toEqual([
        'q1',
        'q2',
        newQuestionId,
        'q3',
        'q4',
      ])
      // elementIds must be a plain string[], not a Collection subclass instance
      expect(newSurvey.elementIds.constructor).toBe(Array)
    })

    test('updates questionIds when adding a question after specific question', () => {
      const newSurvey = survey.addQuestion(
        'g1',
        { text: { en: 'New Question' } },
        { afterId: 'q1' },
      )
      const newQuestionId = newSurvey.elements.questions()[1]._id

      expect(newSurvey.elementIds).toEqual([
        'q1',
        newQuestionId,
        'q2',
        'q3',
        'q4',
      ])
    })

    test('updates questionIds when moving a question', () => {
      const newSurvey = survey.moveQuestion('q3', 'g1', 0)

      expect(newSurvey.elementIds).toEqual(['q3', 'q1', 'q2', 'q4'])
    })

    test('updates questionIds when deleting a question', () => {
      const newSurvey = survey.deleteQuestion('q2')

      expect(newSurvey.elementIds).toEqual(['q1', 'q3', 'q4'])
    })

    test('updates questionIds when deleting a question group', () => {
      const newSurvey = survey.deleteSection('g2')

      expect(newSurvey.elementIds).toEqual(['q1', 'q2'])
    })
  })

  describe('applySortOrder', () => {
    test('sorts groups and questions according to groupIds and questionIds', () => {
      survey.sectionIds = ['g3', 'g1', 'g2']
      survey.elementIds = ['q3', 'q4', 'q1', 'q2']

      const sortedSurvey = survey.applySortOrder()

      expect(sortedSurvey.sections.groups()[0]._id).toBe('g3')
      expect(sortedSurvey.sections.groups()[1]._id).toBe('g1')
      expect(sortedSurvey.sections.groups()[2]._id).toBe('g2')

      expect(sortedSurvey.elements.questions()[0]._id).toBe('q3')
      expect(sortedSurvey.elements.questions()[1]._id).toBe('q4')
      expect(sortedSurvey.elements.questions()[2]._id).toBe('q1')
      expect(sortedSurvey.elements.questions()[3]._id).toBe('q2')
    })

    test('handles missing groups and questions gracefully', () => {
      survey.sectionIds = ['g3', 'g1', 'g4', 'g2']
      survey.elementIds = ['q3', 'q5', 'q1', 'q2', 'q4']

      const sortedSurvey = survey.applySortOrder()

      expect(sortedSurvey.sections.groups().length).toBe(3)
      expect(sortedSurvey.sections.groups()[0]._id).toBe('g3')
      expect(sortedSurvey.sections.groups()[1]._id).toBe('g1')
      expect(sortedSurvey.sections.groups()[2]._id).toBe('g2')

      expect(sortedSurvey.elements.questions().length).toBe(4)
      expect(sortedSurvey.elements.questions()[0]._id).toBe('q3')
      expect(sortedSurvey.elements.questions()[1]._id).toBe('q1')
      expect(sortedSurvey.elements.questions()[2]._id).toBe('q2')
      expect(sortedSurvey.elements.questions()[3]._id).toBe('q4')
    })

    test('returns a new Survey instance', () => {
      survey.sectionIds = ['g2', 'g1', 'g3']
      survey.elementIds = ['q2', 'q1', 'q4', 'q3']

      const sortedSurvey = survey.applySortOrder()

      expect(sortedSurvey).not.toBe(survey)
    })

    test('keeps sections/elements when the id arrays are empty (older rows / late-hydrated relations)', () => {
      // An older survey row whose sectionIds was never populated — the section
      // rows still exist via the relation. applySortOrder must not drop them.
      survey.sectionIds = []
      survey.elementIds = []

      const sortedSurvey = survey.applySortOrder()

      expect(sortedSurvey.sections.length).toBeGreaterThan(0)
      expect(sortedSurvey.elements.length).toBeGreaterThan(0)
      expect(sortedSurvey.sectionIds.length).toBe(sortedSurvey.sections.length)
    })
  })

  describe('updateName', () => {
    test('updates name', () => {
      const survey = new Survey({
        _id: '1',
        createdById: '1',
        name: 'Original Name',
      })

      const updatedSurvey = survey.updateName('New Name')

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.name).toBe('New Name')
      expect(survey.name).toBe('Original Name')
    })

    test('does not accept a language parameter', () => {
      const survey = new Survey({
        _id: '1',
        createdById: '1',
        name: 'Original Name',
      })

      const updatedSurvey = survey.updateName('New Name')

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.name).toBe('New Name')
      expect(survey.name).toBe('Original Name')
    })
  })

  describe('updateTitle', () => {
    test('updates title in the default language', () => {
      const survey = new Survey({
        _id: '1',
        createdById: '1',
        title: { en: 'Original Title' },
      })

      const updatedSurvey = survey.updateTitle('New Title')

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.title.en).toBe('New Title')
      expect(survey.title.en).toBe('Original Title')
    })

    test('updates title in a specified language', () => {
      const survey = new Survey({
        _id: '1',
        createdById: '1',
        title: { en: 'Original Title', fr: 'Titre Original' },
      })

      const updatedSurvey = survey.updateTitle('Nouveau Titre', 'fr')

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.title.en).toBe('Original Title')
      expect(updatedSurvey.title.fr).toBe('Nouveau Titre')
      expect(survey.title.fr).toBe('Titre Original')
    })
  })
})
