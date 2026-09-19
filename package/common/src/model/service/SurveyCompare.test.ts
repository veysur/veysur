// cspell:disable
import { Survey } from '../constructor/Survey'
import { L10n } from '../constructor/L10n'
import { SurveyCompare } from './SurveyCompare'

describe('SurveyCompare', () => {
  const compare = new SurveyCompare()

  describe('identical surveys', () => {
    test('should consider identical surveys equivalent', () => {
      const survey = new Survey({
        name: 'Test Survey',
        title: { en: 'Test Title' },
        createdById: 'user1',
      })

      const result = compare.compare(survey, survey)

      expect(result.isEquivalent).toBe(true)
      expect(result.summary.totalChanges).toBe(0)
      expect(result.differences.fields).toHaveLength(0)
      expect(result.differences.l10n).toHaveLength(0)
      expect(result.differences.collections).toHaveLength(0)
    })

    test('should ignore _id, createdAt, and updatedAt differences', () => {
      const surveyA = new Survey({
        _id: 'id1',
        name: 'Test Survey',
        title: { en: 'Test Title' },
        createdById: 'user1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      })

      const surveyB = new Survey({
        _id: 'id2',
        name: 'Test Survey',
        title: { en: 'Test Title' },
        createdById: 'user1',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(true)
      expect(result.summary.totalChanges).toBe(0)
    })
  })

  describe('simple field changes', () => {
    test('should detect name change', () => {
      const surveyA = new Survey({
        name: 'Survey V1',
        createdById: 'user1',
      })

      const surveyB = new Survey({
        name: 'Survey V2',
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.fields).toContainEqual({
        path: 'name',
        type: 'modified',
        oldValue: 'Survey V1',
        newValue: 'Survey V2',
      })
      expect(result.summary.totalChanges).toBe(1)
    })

    test('should detect createdById change', () => {
      const surveyA = new Survey({
        name: 'Test',
        createdById: 'user1',
      })

      const surveyB = new Survey({
        name: 'Test',
        createdById: 'user2',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.fields).toContainEqual({
        path: 'createdById',
        type: 'modified',
        oldValue: 'user1',
        newValue: 'user2',
      })
    })
  })

  describe('L10n changes', () => {
    test('should detect title language addition', () => {
      const surveyA = new Survey({
        title: { en: 'Title' },
        createdById: 'user1',
      })

      const surveyB = new Survey({
        title: { en: 'Title', es: 'Título' },
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.l10n).toContainEqual({
        path: 'title',
        type: 'added',
        language: 'es',
        newValue: 'Título',
      })
    })

    test('should detect title language modification', () => {
      const surveyA = new Survey({
        title: { en: 'Old Title' },
        createdById: 'user1',
      })

      const surveyB = new Survey({
        title: { en: 'New Title' },
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.l10n).toContainEqual({
        path: 'title',
        type: 'modified',
        language: 'en',
        oldValue: 'Old Title',
        newValue: 'New Title',
      })
    })

    test('should detect title language removal', () => {
      const surveyA = new Survey({
        title: { en: 'Title', es: 'Título' },
        createdById: 'user1',
      })

      const surveyB = new Survey({
        title: { en: 'Title' },
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.l10n).toContainEqual({
        path: 'title',
        type: 'removed',
        language: 'es',
        oldValue: 'Título',
      })
    })

    test('should detect welcome message changes', () => {
      const welcomeSection = (desc: Record<string, string>) => ({
        _id: 'WELCOME',
        code: 'WELCOME',
        kind: 'welcome' as const,
        desc,
      })
      const surveyA = new Survey({
        sections: [welcomeSection({ en: 'Welcome' })],
        createdById: 'user1',
      })

      const surveyB = new Survey({
        sections: [welcomeSection({ en: 'Welcome!', fr: 'Bienvenue!' })],
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const welcomeDiff = result.differences.collections.find(
        (c) => c.itemType === 'section' && c.itemId === 'WELCOME',
      )
      expect(welcomeDiff?.type).toBe('modified')
      expect(welcomeDiff?.differences).toContainEqual({
        path: 'sections[WELCOME].desc.en',
        type: 'modified',
        oldValue: 'Welcome',
        newValue: 'Welcome!',
      })
      expect(welcomeDiff?.differences).toContainEqual({
        path: 'sections[WELCOME].desc.fr',
        type: 'added',
        newValue: 'Bienvenue!',
      })
    })
  })

  describe('configuration changes', () => {
    test('should detect presentation changes', () => {
      const surveyA = new Survey({
        presentation: { title: true, progressBar: false },
        createdById: 'user1',
      })

      const surveyB = new Survey({
        presentation: { title: false, progressBar: true },
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.fields).toContainEqual({
        path: 'presentation.title',
        type: 'modified',
        oldValue: true,
        newValue: false,
      })
      expect(result.differences.fields).toContainEqual({
        path: 'presentation.progressBar',
        type: 'modified',
        oldValue: false,
        newValue: true,
      })
    })

    test('should detect language config changes', () => {
      const surveyA = new Survey({
        language: { default: 'en', options: ['en'] },
        createdById: 'user1',
      })

      const surveyB = new Survey({
        language: { default: 'es', options: ['en', 'es'] },
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.fields).toContainEqual({
        path: 'language.default',
        type: 'modified',
        oldValue: 'en',
        newValue: 'es',
      })
    })

    test('should detect nested config additions', () => {
      const surveyA = new Survey({
        presentation: {},
        createdById: 'user1',
      })

      const surveyB = new Survey({
        presentation: { title: true },
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.fields).toContainEqual({
        path: 'presentation.title',
        type: 'added',
        newValue: true,
      })
    })
  })

  describe('group operations', () => {
    test('should detect added group', () => {
      const surveyA = new Survey({
        createdById: 'user1',
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.summary.addedItems).toBe(1)
      expect(result.differences.collections).toContainEqual(
        expect.objectContaining({
          path: 'groups[G1]',
          type: 'added',
          itemType: 'group',
          itemId: 'G1',
        }),
      )
    })

    test('should detect removed group', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.summary.removedItems).toBe(1)
      expect(result.differences.collections).toContainEqual(
        expect.objectContaining({
          path: 'groups[G1]',
          type: 'removed',
          itemType: 'group',
          itemId: 'G1',
        }),
      )
    })

    test('should detect modified group name', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Old Name' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'New Name' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.summary.modifiedItems).toBe(1)
      const groupDiff = result.differences.collections.find(
        (d) => d.itemId === 'G1' && d.type === 'modified',
      )
      expect(groupDiff).toBeDefined()
      expect(groupDiff?.differences).toContainEqual({
        path: 'groups[G1].name.en',
        type: 'modified',
        oldValue: 'Old Name',
        newValue: 'New Name',
      })
    })

    test('should consider groups with same code but different IDs as equivalent', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        sections: [
          {
            _id: 'group-id-1',
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [
          {
            _id: 'group-id-2',
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(true)
      expect(result.summary.totalChanges).toBe(0)
    })
  })

  describe('welcome / thank-you section operations', () => {
    test('should detect a thank-you section desc edit as a non-equivalent, compatible change', () => {
      const surveyA = new Survey({ _id: 's1', createdById: 'user1' })
        .addSection({})
        .updateThankYouSectionDesc('<p>Thanks</p>', 'en')

      const surveyB = new Survey({ _id: 's1', createdById: 'user1' })
        .addSection({})
        .updateThankYouSectionDesc('<p>Thank you</p>', 'en')

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.isCompatible).toBe(true)
      expect(result.differences.collections).toContainEqual(
        expect.objectContaining({
          path: 'sections[THANKYOU]',
          type: 'modified',
          itemType: 'section',
          itemId: 'THANKYOU',
        }),
      )
    })
  })

  describe('question operations', () => {
    test('should detect added question', () => {
      const surveyA = new Survey({
        createdById: 'user1',
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.summary.addedItems).toBe(1)
      expect(result.differences.collections).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1]',
          type: 'added',
          itemType: 'question',
          itemId: 'Q1',
        }),
      )
    })

    test('should detect removed question', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.summary.removedItems).toBe(1)
    })

    test('should detect question type change', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].type',
        type: 'modified',
        oldValue: 'text',
        newValue: 'multiple-choice',
      })
    })

    test('should detect question moved to different group', () => {
      const groupA = {
        _id: 'group-a',
        code: 'GA',
        name: { en: 'Group A' },
        createdById: 'user1',
        surveyId: 'survey1',
      }

      const groupB = {
        _id: 'group-b',
        code: 'GB',
        name: { en: 'Group B' },
        createdById: 'user1',
        surveyId: 'survey1',
      }

      const surveyA = new Survey({
        createdById: 'user1',
        sections: [groupA, groupB],
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question 1' },
            sectionId: 'group-a',
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [groupA, groupB],
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question 1' },
            sectionId: 'group-b',
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].sectionId',
        type: 'modified',
        oldValue: 'GA',
        newValue: 'GB',
      })
    })
  })

  describe('reordering detection', () => {
    test('should detect reordered groups', () => {
      const groups = [
        {
          _id: 'g1',
          code: 'G1',
          name: { en: 'Group 1' },
          createdById: 'user1',
          surveyId: 'survey1',
        },
        {
          _id: 'g2',
          code: 'G2',
          name: { en: 'Group 2' },
          createdById: 'user1',
          surveyId: 'survey1',
        },
        {
          _id: 'g3',
          code: 'G3',
          name: { en: 'Group 3' },
          createdById: 'user1',
          surveyId: 'survey1',
        },
      ]

      const surveyA = new Survey({
        createdById: 'user1',
        sections: groups,
        sectionIds: ['g1', 'g2', 'g3'],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: groups,
        sectionIds: ['g3', 'g1', 'g2'],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.reordering.groups).toBeDefined()
      expect(result.differences.reordering.groups?.oldOrder).toEqual([
        'G1',
        'G2',
        'G3',
      ])
      expect(result.differences.reordering.groups?.newOrder).toEqual([
        'G3',
        'G1',
        'G2',
      ])
      expect(result.summary.reorderedCollections).toBe(1)
    })

    test('should detect reordered questions', () => {
      const questions = [
        {
          _id: 'q1',
          code: 'Q1',
          type: 'text',
          text: { en: 'Question 1' },
          createdById: 'user1',
          surveyId: 'survey1',
        },
        {
          _id: 'q2',
          code: 'Q2',
          type: 'text',
          text: { en: 'Question 2' },
          createdById: 'user1',
          surveyId: 'survey1',
        },
      ]

      const surveyA = new Survey({
        createdById: 'user1',
        elements: questions,
        elementIds: ['q1', 'q2'],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: questions,
        elementIds: ['q2', 'q1'],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.reordering.questions).toBeDefined()
      expect(result.differences.reordering.questions?.oldOrder).toEqual([
        'Q1',
        'Q2',
      ])
      expect(result.differences.reordering.questions?.newOrder).toEqual([
        'Q2',
        'Q1',
      ])
    })

    test('should not detect reordering if order is the same', () => {
      const groups = [
        {
          code: 'G1',
          name: { en: 'Group 1' },
          createdById: 'user1',
          surveyId: 'survey1',
        },
      ]

      const surveyA = new Survey({
        createdById: 'user1',
        sections: groups,
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: groups,
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.differences.reordering.groups).toBeUndefined()
      expect(result.differences.reordering.questions).toBeUndefined()
    })
  })

  describe('nested changes', () => {
    test('should detect added subquestion', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [
              {
                code: 'SQ1',
                text: { en: 'Subquestion 1' },
              },
            ],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].subquestions[SQ1]',
          type: 'added',
        }),
      )
    })

    test('should detect modified answer option', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Option A' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Option A Modified' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].answerOptions[A1].label.en',
        type: 'modified',
        oldValue: 'Option A',
        newValue: 'Option A Modified',
      })
    })

    test('should detect answer option label change in specific language', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Yes', es: 'Sí' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Yes', es: 'Sí', fr: 'Oui' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].answerOptions[A1].label.fr',
        type: 'added',
        newValue: 'Oui',
      })
    })
  })

  describe('complex scenarios', () => {
    test('should detect multiple simultaneous changes', () => {
      const surveyA = new Survey({
        name: 'Survey V1',
        title: { en: 'Old Title' },
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        name: 'Survey V2',
        title: { en: 'Old Title', es: 'Nuevo Título' },
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
          {
            code: 'G2',
            name: { en: 'Group 2' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Question 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)

      // Verify name changed
      expect(result.differences.fields).toContainEqual(
        expect.objectContaining({ path: 'name', type: 'modified' }),
      )

      // Verify title translation added
      expect(result.differences.l10n).toContainEqual(
        expect.objectContaining({
          path: 'title',
          type: 'added',
          language: 'es',
        }),
      )

      // Verify group added
      expect(result.summary.addedItems).toBeGreaterThanOrEqual(1)

      // Verify question modified (type changed)
      expect(result.summary.modifiedItems).toBeGreaterThanOrEqual(1)

      // Verify summary counts
      expect(result.summary.totalChanges).toBeGreaterThan(0)
    })

    test('should handle deep nested changes correctly', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Matrix Question' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [
              {
                code: 'SQ1',
                text: { en: 'Subquestion 1' },
              },
            ],
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Strongly Agree' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Matrix Question' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [
              {
                code: 'SQ1',
                text: { en: 'Subquestion 1', fr: 'Sous-question 1' },
              },
            ],
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({
                  en: 'Strongly Agree',
                  fr: "Tout à fait d'accord",
                }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)

      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )

      // Verify subquestion text language added
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].subquestions[SQ1].text.fr',
        type: 'added',
        newValue: 'Sous-question 1',
      })

      // Verify answer option label language added
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].answerOptions[A1].label.fr',
        type: 'added',
        newValue: "Tout à fait d'accord",
      })
    })
  })

  describe('edge cases', () => {
    test('should handle empty surveys', () => {
      const surveyA = new Survey({
        createdById: 'user1',
      })

      const surveyB = new Survey({
        createdById: 'user1',
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(true)
      expect(result.summary.totalChanges).toBe(0)
    })

    test('should handle surveys with only groups, no questions', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(true)
    })

    test('should detect group description changes', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            desc: { en: 'Old description' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group 1' },
            desc: { en: 'New description' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const groupDiff = result.differences.collections.find(
        (d) => d.itemId === 'G1' && d.type === 'modified',
      )
      expect(groupDiff?.differences).toContainEqual({
        path: 'groups[G1].desc.en',
        type: 'modified',
        oldValue: 'Old description',
        newValue: 'New description',
      })
    })

    test('should detect question detail changes', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question' },
            detail: { en: 'Old detail' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question' },
            detail: { en: 'New detail' },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].detail.en',
        type: 'modified',
        oldValue: 'Old detail',
        newValue: 'New detail',
      })
    })

    test('should detect subquestion detail changes', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Matrix' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [
              {
                code: 'SQ1',
                text: { en: 'Subquestion' },
                detail: { en: 'Old detail' },
              },
            ],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Matrix' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [
              {
                code: 'SQ1',
                text: { en: 'Subquestion' },
                detail: { en: 'New detail' },
              },
            ],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].subquestions[SQ1].detail.en',
        type: 'modified',
        oldValue: 'Old detail',
        newValue: 'New detail',
      })
    })

    test('should detect removed subquestion', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Matrix' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [
              { code: 'SQ1', text: { en: 'Sub 1' } },
              { code: 'SQ2', text: { en: 'Sub 2' } },
            ],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'matrixComposite',
            text: { en: 'Matrix' },
            createdById: 'user1',
            surveyId: 'survey1',
            subquestions: [{ code: 'SQ1', text: { en: 'Sub 1' } }],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].subquestions[SQ2]',
          type: 'removed',
        }),
      )
    })

    test('should detect removed answer option', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Choose' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Option 1' }),
                createdById: 'user1',
              },
              {
                code: 'A2',
                label: new L10n({ en: 'Option 2' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Choose' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Option 1' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].answerOptions[A2]',
          type: 'removed',
        }),
      )
    })

    test('should detect added answer option', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Choose' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Option 1' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'multiple-choice',
            text: { en: 'Choose' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Option 1' }),
                createdById: 'user1',
              },
              {
                code: 'A2',
                label: new L10n({ en: 'Option 2' }),
                createdById: 'user1',
              },
            ],
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].answerOptions[A2]',
          type: 'added',
        }),
      )
    })

    test('should handle thankYou configuration changes', () => {
      const thankYouSection = (
        desc: Record<string, string>,
        url: Record<string, string>,
        text: Record<string, string>,
      ) => ({
        _id: 'THANKYOU',
        code: 'THANKYOU',
        kind: 'thankYou' as const,
        desc,
        config: { link: { url, text } },
      })
      const surveyA = new Survey({
        createdById: 'user1',
        sections: [
          thankYouSection(
            { en: 'Thank you' },
            { en: 'http://old.com' },
            { en: 'Old Link' },
          ),
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [
          thankYouSection(
            { en: 'Thank you very much' },
            { en: 'http://new.com' },
            { en: 'New Link' },
          ),
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const thankYouDiff = result.differences.collections.find(
        (c) => c.itemType === 'section' && c.itemId === 'THANKYOU',
      )
      expect(thankYouDiff?.differences).toContainEqual({
        path: 'sections[THANKYOU].desc.en',
        type: 'modified',
        oldValue: 'Thank you',
        newValue: 'Thank you very much',
      })
      expect(thankYouDiff?.differences).toContainEqual({
        path: 'sections[THANKYOU].config.link.url.en',
        type: 'modified',
        oldValue: 'http://old.com',
        newValue: 'http://new.com',
      })
      expect(thankYouDiff?.differences).toContainEqual({
        path: 'sections[THANKYOU].config.link.text.en',
        type: 'modified',
        oldValue: 'Old Link',
        newValue: 'New Link',
      })
    })

    test('should handle dataPolicy changes', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        dataPolicy: { text: { en: 'Old policy' } },
      })

      const surveyB = new Survey({
        createdById: 'user1',
        dataPolicy: { text: { en: 'New policy' } },
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.l10n).toContainEqual({
        path: 'dataPolicy.text',
        type: 'modified',
        language: 'en',
        oldValue: 'Old policy',
        newValue: 'New policy',
      })
    })

    test('should handle legalNotice changes', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        legalNotice: { text: { en: 'Old notice' } },
      })

      const surveyB = new Survey({
        createdById: 'user1',
        legalNotice: { text: { en: 'New notice' } },
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.l10n).toContainEqual({
        path: 'legalNotice.text',
        type: 'modified',
        language: 'en',
        oldValue: 'Old notice',
        newValue: 'New notice',
      })
    })

    test('should handle question attributes changes', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question' },
            attributes: { mandatory: true, hidden: false },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question' },
            attributes: { mandatory: false, hidden: true },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const questionDiff = result.differences.collections.find(
        (d) => d.itemId === 'Q1' && d.type === 'modified',
      )
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].attributes.mandatory',
        type: 'modified',
        oldValue: true,
        newValue: false,
      })
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].attributes.hidden',
        type: 'modified',
        oldValue: false,
        newValue: true,
      })
    })

    test('should handle group attributes changes', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group' },
            attributes: { collapsed: false },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const surveyB = new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group' },
            attributes: { collapsed: true },
            createdById: 'user1',
            surveyId: 'survey1',
          },
        ],
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      const groupDiff = result.differences.collections.find(
        (d) => d.itemId === 'G1' && d.type === 'modified',
      )
      expect(groupDiff?.differences).toContainEqual({
        path: 'groups[G1].attributes.collapsed',
        type: 'modified',
        oldValue: false,
        newValue: true,
      })
    })

    test('should detect array value changes in nested config', () => {
      const surveyA = new Survey({
        createdById: 'user1',
        language: { default: 'en', options: ['en', 'es'] },
      })

      const surveyB = new Survey({
        createdById: 'user1',
        language: { default: 'en', options: ['en', 'es', 'fr'] },
      })

      const result = compare.compare(surveyA, surveyB)

      expect(result.isEquivalent).toBe(false)
      expect(result.differences.fields).toContainEqual({
        path: 'language.options',
        type: 'modified',
        oldValue: ['en', 'es'],
        newValue: ['en', 'es', 'fr'],
      })
    })
  })

  describe('compatibility checking', () => {
    describe('compatible scenarios', () => {
      test('identical surveys should be compatible', () => {
        const survey = new Survey({
          name: 'Test',
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(survey, survey)

        expect(result.isCompatible).toBe(true)
        expect(result.compatibility?.incompatibilities).toHaveLength(0)
      })

      test('survey-b with additional questions should be compatible', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
            {
              code: 'Q2',
              type: 'text',
              text: { en: 'Question 2' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(true)
        expect(result.isEquivalent).toBe(false) // Not equivalent, but compatible
      })

      test('survey-b with additional answer options should be compatible', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'multiple-choice',
              text: { en: 'Choose one' },
              createdById: 'user1',
              surveyId: 'survey1',
              answerOptions: [
                {
                  code: 'A1',
                  label: new L10n({ en: 'Option 1' }),
                  createdById: 'user1',
                },
              ],
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'multiple-choice',
              text: { en: 'Choose one' },
              createdById: 'user1',
              surveyId: 'survey1',
              answerOptions: [
                {
                  code: 'A1',
                  label: new L10n({ en: 'Option 1' }),
                  createdById: 'user1',
                },
                {
                  code: 'A2',
                  label: new L10n({ en: 'Option 2' }),
                  createdById: 'user1',
                },
              ],
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(true)
      })
    })

    describe('incompatible scenarios', () => {
      test('missing question should be incompatible', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.missingQuestions).toBe(1)
        expect(result.compatibility?.incompatibilities).toContainEqual(
          expect.objectContaining({
            reason: 'missing_question',
            itemCode: 'Q1',
          }),
        )
      })

      test('question type change should be incompatible', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'multiple-choice',
              text: { en: 'Question 1' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.incompatibleTypes).toBe(1)
        expect(result.compatibility?.incompatibilities).toContainEqual(
          expect.objectContaining({
            reason: 'incompatible_type',
            itemCode: 'Q1',
            surveyAType: 'text',
            surveyBType: 'multiple-choice',
          }),
        )
      })

      test('removed answer option should be incompatible', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'multiple-choice',
              text: { en: 'Choose one' },
              createdById: 'user1',
              surveyId: 'survey1',
              answerOptions: [
                {
                  code: 'A1',
                  label: new L10n({ en: 'Option 1' }),
                  createdById: 'user1',
                },
                {
                  code: 'A2',
                  label: new L10n({ en: 'Option 2' }),
                  createdById: 'user1',
                },
              ],
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'multiple-choice',
              text: { en: 'Choose one' },
              createdById: 'user1',
              surveyId: 'survey1',
              answerOptions: [
                {
                  code: 'A1',
                  label: new L10n({ en: 'Option 1' }),
                  createdById: 'user1',
                },
              ],
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.missingAnswerOptions).toBe(1)
        expect(result.compatibility?.incompatibilities).toContainEqual(
          expect.objectContaining({
            reason: 'missing_answer_option',
            itemCode: 'A2',
            path: 'questions[Q1].answerOptions[A2]',
          }),
        )
      })

      test('removed subquestion should be incompatible', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'matrixComposite',
              text: { en: 'Matrix' },
              createdById: 'user1',
              surveyId: 'survey1',
              subquestions: [
                { code: 'SQ1', text: { en: 'Sub 1' } },
                { code: 'SQ2', text: { en: 'Sub 2' } },
              ],
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'matrixComposite',
              text: { en: 'Matrix' },
              createdById: 'user1',
              surveyId: 'survey1',
              subquestions: [{ code: 'SQ1', text: { en: 'Sub 1' } }],
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.missingSubquestions).toBe(1)
        expect(result.compatibility?.incompatibilities).toContainEqual(
          expect.objectContaining({
            reason: 'missing_subquestion',
            itemCode: 'SQ2',
          }),
        )
      })

      test('multiple incompatibilities should be detected', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Q1' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
            {
              code: 'Q2',
              type: 'multiple-choice',
              text: { en: 'Q2' },
              createdById: 'user1',
              surveyId: 'survey1',
              answerOptions: [
                {
                  code: 'A1',
                  label: new L10n({ en: 'A1' }),
                  createdById: 'user1',
                },
              ],
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q2',
              type: 'text', // Type changed
              text: { en: 'Q2' },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        // Q1 missing, Q2 type changed, and A1 answer option missing (since text type doesn't have answer options)
        expect(result.compatibility?.summary.totalIncompatibilities).toBe(3)
        expect(result.compatibility?.summary.missingQuestions).toBe(1) // Q1
        expect(result.compatibility?.summary.incompatibleTypes).toBe(1) // Q2
        expect(result.compatibility?.summary.missingAnswerOptions).toBe(1) // A1
      })
    })

    describe('question attribute compatibility', () => {
      test('should detect incompatible required constraint', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              attributes: { required: false },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              attributes: { required: true },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.incompatibleAttributes).toBe(1)
        expect(
          result.compatibility?.summary.incompatibleRequiredConstraints,
        ).toBe(1)
        expect(result.compatibility?.incompatibilities).toContainEqual(
          expect.objectContaining({
            reason: 'incompatible_required_constraint',
            itemCode: 'Q1',
          }),
        )
      })

      test('should detect incompatible choice constraints', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'checkbox',
              text: { en: 'Question 1' },
              attributes: { choiceMinMax: { min: 1, max: 5 } },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'checkbox',
              text: { en: 'Question 1' },
              attributes: { choiceMinMax: { min: 2, max: 3 } },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.incompatibleAttributes).toBe(1)
        expect(
          result.compatibility?.summary.incompatibleChoiceConstraints,
        ).toBe(1)
        expect(result.compatibility?.incompatibilities).toContainEqual(
          expect.objectContaining({
            reason: 'incompatible_choice_constraint',
            itemCode: 'Q1',
            attributeName: 'choiceMinMax',
          }),
        )
      })

      test('should detect incompatible length constraints', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              attributes: { lengthMinMax: { min: 5, max: 100 } },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              attributes: { lengthMinMax: { min: 10, max: 50 } },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.incompatibleAttributes).toBe(1)
        expect(
          result.compatibility?.summary.incompatibleLengthConstraints,
        ).toBe(1)
      })

      test('should detect incompatible number constraints', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'number',
              text: { en: 'Question 1' },
              attributes: {
                numberMinMax: { min: 0, max: 100 },
                numberNegAllowed: true,
              },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'number',
              text: { en: 'Question 1' },
              attributes: {
                numberMinMax: { min: 10, max: 50 },
                numberNegAllowed: false,
              },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.incompatibleAttributes).toBe(2)
        expect(
          result.compatibility?.summary.incompatibleNumberConstraints,
        ).toBe(2) // min/max + negative
      })

      test('should be compatible when target has more permissive constraints', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'checkbox',
              text: { en: 'Question 1' },
              attributes: {
                required: true,
                choiceMinMax: { min: 2, max: 5 },
              },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'checkbox',
              text: { en: 'Question 1' },
              attributes: {
                required: false,
                choiceMinMax: { min: 1, max: 10 },
              },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(true)
        expect(result.compatibility?.summary.incompatibleAttributes).toBe(0)
      })

      test('should detect multiple attribute incompatibilities across questions', () => {
        const surveyA = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              attributes: { required: false },
              createdById: 'user1',
              surveyId: 'survey1',
            },
            {
              code: 'Q2',
              type: 'checkbox',
              text: { en: 'Question 2' },
              attributes: { choiceMinMax: { min: 1, max: 5 } },
              createdById: 'user1',
              surveyId: 'survey1',
            },
            {
              code: 'Q3',
              type: 'number',
              text: { en: 'Question 3' },
              attributes: { numberNegAllowed: true },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const surveyB = new Survey({
          createdById: 'user1',
          elements: [
            {
              code: 'Q1',
              type: 'text',
              text: { en: 'Question 1' },
              attributes: { required: true },
              createdById: 'user1',
              surveyId: 'survey1',
            },
            {
              code: 'Q2',
              type: 'checkbox',
              text: { en: 'Question 2' },
              attributes: { choiceMinMax: { min: 2, max: 3 } },
              createdById: 'user1',
              surveyId: 'survey1',
            },
            {
              code: 'Q3',
              type: 'number',
              text: { en: 'Question 3' },
              attributes: { numberNegAllowed: false },
              createdById: 'user1',
              surveyId: 'survey1',
            },
          ],
        })

        const result = compare.compare(surveyA, surveyB)

        expect(result.isCompatible).toBe(false)
        expect(result.compatibility?.summary.totalIncompatibilities).toBe(3)
        expect(result.compatibility?.summary.incompatibleAttributes).toBe(3)
        expect(
          result.compatibility?.summary.incompatibleRequiredConstraints,
        ).toBe(1)
        expect(
          result.compatibility?.summary.incompatibleChoiceConstraints,
        ).toBe(1)
        expect(
          result.compatibility?.summary.incompatibleNumberConstraints,
        ).toBe(1)
      })
    })
  })

  describe('participant attribute change detection', () => {
    const baseSurvey = new Survey({
      name: 'S',
      createdById: 'u1',
    })

    test('no attribute changes — isEquivalent stays true', () => {
      const attrs = [
        { name: 'age', required: true, internal: false, example: null },
      ]
      const result = compare.compare(baseSurvey, baseSurvey, attrs, attrs)
      expect(result.isEquivalent).toBe(true)
      expect(result.differences.participantAttributes).toHaveLength(0)
      expect(result.differences.participantAttributesL10n).toHaveLength(0)
    })

    test('adding an attribute is detected', () => {
      const attrsA = [
        { name: 'age', required: false, internal: false, example: null },
      ]
      const attrsB = [
        { name: 'age', required: false, internal: false, example: null },
        { name: 'company', required: false, internal: false, example: null },
      ]
      const result = compare.compare(baseSurvey, baseSurvey, attrsA, attrsB)
      expect(result.isEquivalent).toBe(false)
      expect(result.summary.totalChanges).toBeGreaterThan(0)
      expect(result.differences.participantAttributes).toHaveLength(1)
      expect(result.differences.participantAttributes[0].type).toBe('added')
      expect(result.differences.participantAttributes[0].name).toBe('company')
    })

    test('removing an attribute is detected', () => {
      const attrsA = [
        { name: 'age', required: false, internal: false, example: null },
        { name: 'company', required: false, internal: false, example: null },
      ]
      const attrsB = [
        { name: 'age', required: false, internal: false, example: null },
      ]
      const result = compare.compare(baseSurvey, baseSurvey, attrsA, attrsB)
      expect(result.isEquivalent).toBe(false)
      expect(result.differences.participantAttributes).toHaveLength(1)
      expect(result.differences.participantAttributes[0].type).toBe('removed')
      expect(result.differences.participantAttributes[0].name).toBe('company')
    })

    test('modifying required is detected', () => {
      const attrsA = [
        { name: 'age', required: false, internal: false, example: null },
      ]
      const attrsB = [
        { name: 'age', required: true, internal: false, example: null },
      ]
      const result = compare.compare(baseSurvey, baseSurvey, attrsA, attrsB)
      expect(result.isEquivalent).toBe(false)
      expect(result.differences.participantAttributes).toHaveLength(1)
      expect(result.differences.participantAttributes[0].type).toBe('modified')
    })

    test('modifying internal is detected', () => {
      const attrsA = [
        { name: 'age', required: false, internal: false, example: null },
      ]
      const attrsB = [
        { name: 'age', required: false, internal: true, example: null },
      ]
      const result = compare.compare(baseSurvey, baseSurvey, attrsA, attrsB)
      expect(result.isEquivalent).toBe(false)
      expect(result.differences.participantAttributes).toHaveLength(1)
    })

    test('modifying example is detected', () => {
      const attrsA = [
        { name: 'age', required: false, internal: false, example: null },
      ]
      const attrsB = [
        { name: 'age', required: false, internal: false, example: '42' },
      ]
      const result = compare.compare(baseSurvey, baseSurvey, attrsA, attrsB)
      expect(result.isEquivalent).toBe(false)
      expect(result.differences.participantAttributes).toHaveLength(1)
    })

    test('changing an attribute label (L10n) is detected', () => {
      const langA = [
        {
          languageCode: 'en',
          data: { age: { label: 'Age', description: undefined } },
        },
      ]
      const langB = [
        {
          languageCode: 'en',
          data: { age: { label: 'Your Age', description: undefined } },
        },
      ]
      const result = compare.compare(
        baseSurvey,
        baseSurvey,
        [],
        [],
        langA,
        langB,
      )
      expect(result.isEquivalent).toBe(false)
      expect(result.differences.participantAttributesL10n).toHaveLength(1)
      expect(result.differences.participantAttributesL10n[0].field).toBe(
        'label',
      )
      expect(result.differences.participantAttributesL10n[0].language).toBe(
        'en',
      )
      expect(result.differences.participantAttributesL10n[0].name).toBe('age')
    })

    test('adding an attribute label for a new language is detected', () => {
      const langA = [{ languageCode: 'en', data: { age: { label: 'Age' } } }]
      const langB = [
        { languageCode: 'en', data: { age: { label: 'Age' } } },
        { languageCode: 'fr', data: { age: { label: 'Âge' } } },
      ]
      const result = compare.compare(
        baseSurvey,
        baseSurvey,
        [],
        [],
        langA,
        langB,
      )
      expect(result.isEquivalent).toBe(false)
      expect(
        result.differences.participantAttributesL10n.length,
      ).toBeGreaterThan(0)
    })
  })
})
