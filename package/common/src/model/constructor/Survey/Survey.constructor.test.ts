import { Survey } from '../Survey'
describe('Survey constructor', () => {
  describe('groups', () => {
    test('initializes surveyId, projectId, and createdById for each group', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [
          { _id: 'g1', name: { en: 'Group 1' } },
          { _id: 'g2', name: { en: 'Group 2' }, createdById: 'user2' },
          { _id: 'g3', name: { en: 'Group 3' } },
        ],
        elements: [],
      }

      const survey = new Survey(surveyData)

      survey.sections.groups().forEach((group) => {
        expect(group.surveyId).toBe('survey1')
      })

      // Check that the group with pre-existing createdById keeps its value
      expect(survey.sections.groups().getById('g2').createdById).toBe('user2')
    })

    test('handles empty groups array', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.sections.groups().length).toBe(0)
    })

    test('handles undefined groups', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.sections.groups().length).toBe(0)
    })

    test('groups always get survey surveyId and projectId even if different values are passed', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [
          {
            _id: 'g1',
            name: { en: 'Group 1' },
            surveyId: 'differentSurvey',
          },
          {
            _id: 'g2',
            name: { en: 'Group 2' },
            surveyId: 'anotherSurvey',
          },
        ],
        elements: [],
      }

      const survey = new Survey(surveyData)

      survey.sections.groups().forEach((group) => {
        expect(group.surveyId).toBe('survey1')
      })
    })
  })

  describe('groupsIds', () => {
    test('initializes groupIds from the _id values of the groups', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [
          { _id: 'g1', name: { en: 'Group 1' } },
          { _id: 'g2', name: { en: 'Group 2' } },
          { _id: 'g3', name: { en: 'Group 3' } },
        ],
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.sectionIds).toEqual(['g1', 'g2', 'g3'])
    })

    test('uses provided groupIds if available', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [
          { _id: 'g1', name: { en: 'Group 1' } },
          { _id: 'g2', name: { en: 'Group 2' } },
          { _id: 'g3', name: { en: 'Group 3' } },
        ],
        sectionIds: ['g3', 'g1', 'g2'],
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.sectionIds).toEqual(['g3', 'g1', 'g2'])
    })

    test('handles empty groups array when initializing groupIds', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.sectionIds).toEqual([])
    })

    test('handles undefined groups when initializing groupIds', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.sectionIds).toEqual([])
    })
  })

  describe('questions', () => {
    test('initializes surveyId, projectId, and createdById for each question', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [
          { _id: 'q1', text: { en: 'Question 1' } },
          { _id: 'q2', text: { en: 'Question 2' }, createdById: 'user2' },
          { _id: 'q3', text: { en: 'Question 3' } },
        ],
      }

      const survey = new Survey(surveyData)

      survey.elements.questions().forEach((question) => {
        expect(question.surveyId).toBe('survey1')
      })

      // Check that the question with pre-existing createdById keeps its value
      expect(survey.elements.questions().getById('q2').createdById).toBe(
        'user2',
      )
    })

    test('handles empty questions array', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.elements.questions().length).toBe(0)
    })

    test('handles undefined questions', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.elements.questions().length).toBe(0)
    })

    test('questions always get survey surveyId and projectId even if different values are passed', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [
          {
            _id: 'q1',
            text: { en: 'Question 1' },
            surveyId: 'differentSurvey',
          },
          {
            _id: 'q2',
            text: { en: 'Question 2' },
            surveyId: 'anotherSurvey',
          },
        ],
      }

      const survey = new Survey(surveyData)

      survey.elements.questions().forEach((question) => {
        expect(question.surveyId).toBe('survey1')
      })
    })
  })

  describe('questionIds', () => {
    test('initializes questionIds from the _id values of the questions', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [
          { _id: 'q1', text: { en: 'Question 1' } },
          { _id: 'q2', text: { en: 'Question 2' } },
          { _id: 'q3', text: { en: 'Question 3' } },
        ],
      }

      const survey = new Survey(surveyData)

      expect(survey.elementIds).toEqual(['q1', 'q2', 'q3'])
    })

    test('uses provided questionIds if available', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [
          { _id: 'q1', text: { en: 'Question 1' } },
          { _id: 'q2', text: { en: 'Question 2' } },
          { _id: 'q3', text: { en: 'Question 3' } },
        ],
        elementIds: ['q3', 'q1', 'q2'],
      }

      const survey = new Survey(surveyData)

      expect(survey.elementIds).toEqual(['q3', 'q1', 'q2'])
    })

    test('handles empty questions array when initializing questionIds', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
        elements: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.elementIds).toEqual([])
    })

    test('handles undefined questions when initializing questionIds', () => {
      const surveyData = {
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
        sections: [],
      }

      const survey = new Survey(surveyData)

      expect(survey.elementIds).toEqual([])
    })
  })
})
