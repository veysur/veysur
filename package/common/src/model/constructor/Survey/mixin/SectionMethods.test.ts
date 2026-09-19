import { Survey } from '../../Survey'

describe('GroupMethods', () => {
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

  describe('addQuestionGroup', () => {
    test('adds a new group to the end when afterId is not provided', () => {
      const updatedSurvey = survey.addSection({
        name: { en: 'New Group' },
      })
      expect(updatedSurvey.sections.groups().length).toBe(4)
      expect(updatedSurvey.sections.groups()[3].name.en).toBe('New Group')
    })

    test('adds a new group after the specified group when afterId is provided', () => {
      const updatedSurvey = survey.addSection(
        { name: { en: 'New Group' } },
        { afterId: 'g1' },
      )
      expect(updatedSurvey.sections.groups().length).toBe(4)
      expect(updatedSurvey.sections.groups()[1].name.en).toBe('New Group')
      expect(updatedSurvey.sections.groups()[2].name.en).toBe('Group 2')
    })

    test('returns a new Survey instance with a new question group', () => {
      const newSurvey = new Survey(survey).addSection()
      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.sections.groups().length).toBe(4)
      expect(survey.sections.groups().length).toBe(3)
    })
  })

  describe('updateQuestionGroup', () => {
    test('returns a new Survey instance with updatedAt question group', () => {
      const newSurvey = new Survey(survey).updateSection('g1', {
        name: { en: 'Updated Group 1' },
      })
      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.sections.groups()[0].name.en).toBe('Updated Group 1')
      expect(survey.sections.groups()[0].name.en).toBe('Group 1')
    })

    test('returns a new Survey instance with updatedAt question group title', () => {
      const newSurvey = new Survey(survey).updateSection('g1', {
        name: { en: 'Updated Group 1' },
      })
      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.sections.groups()[0].name.en).toBe('Updated Group 1')
      expect(survey.sections.groups()[0].name.en).toBe('Group 1')
    })
  })

  describe('moveQuestionGroup', () => {
    test('returns a new Survey instance with the question group moved to the specified position', () => {
      const newSurvey = new Survey(survey).moveSection('g2', 0)

      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.sections.groups()[0]._id).toBe('g2')
      expect(newSurvey.sections.groups()[1]._id).toBe('g1')
      expect(survey.sections.groups()[0]._id).toBe('g1')
      expect(survey.sections.groups()[1]._id).toBe('g2')
    })

    test('re-sorts questions and questionIds to follow the new group order', () => {
      const newSurvey = new Survey(survey).moveSection('g2', 0)

      expect(newSurvey.elementIds).toEqual(['q3', 'q4', 'q1', 'q2'])
      expect(
        newSurvey.elements.questions().map((question) => question._id),
      ).toEqual(['q3', 'q4', 'q1', 'q2'])
      expect(survey.elementIds).toEqual(['q1', 'q2', 'q3', 'q4'])
    })
  })

  describe('deleteQuestionGroup', () => {
    test('returns a new Survey instance with question group and its questions deletedAt', () => {
      const newSurvey = new Survey(survey).deleteSection('g1')
      expect(newSurvey).not.toBe(survey)
      expect(newSurvey.sections.groups().length).toBe(2)
      expect(newSurvey.elements.questions().length).toBe(2)
      expect(survey.sections.groups().length).toBe(3)
      expect(survey.elements.questions().length).toBe(4)
    })
  })

  describe('mutateQuestionGroupAttributes', () => {
    test('updates the specified group attributes', () => {
      const updatedSurvey = new Survey(survey).mutateSectionAttributes(
        'g1',
        (attributes) => ({
          ...attributes,
          description: 'Updated first group',
          newAttr: 'New value',
        }),
      )

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.sections.groups()[0].attributes).toEqual({
        description: 'Updated first group',
        newAttr: 'New value',
      })
      expect(survey.sections.groups()[0].attributes).toEqual({})
    })
  })

  describe('setQuestionGroupAttribute', () => {
    test('sets a new attribute for a group', () => {
      const updatedSurvey = new Survey(survey).setSectionAttribute(
        'g1',
        'newAttr',
        'New value',
      )

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.sections.groups()[0].attributes.newAttr).toBe(
        'New value',
      )
      expect(survey.sections.groups()[0].attributes.newAttr).toBeUndefined()
    })

    test('updates an existing attribute', () => {
      const updatedSurvey = new Survey(survey).setSectionAttribute(
        'g1',
        'description',
        'Updated description',
      )

      expect(updatedSurvey).not.toBe(survey)
      expect(updatedSurvey.sections.groups()[0].attributes.description).toBe(
        'Updated description',
      )
      expect(survey.sections.groups()[0].attributes.description).toBeUndefined()
    })
  })
})
