import { Survey } from '../../constructor/Survey'
import { SurveySubquestionData } from '../../constructor/Survey/SurveySubquestion'
import { SurveyAnswerOptionImageValue } from '../../constructor/Survey/SurveyAnswerOption'
import { L10n } from '../../constructor/L10n'
import { CollectionComparator } from './CollectionComparator'
import { L10nComparator } from './L10nComparator'
import { FieldComparator } from './FieldComparator'

describe('CollectionComparator', () => {
  const comparator = new CollectionComparator(
    new L10nComparator(),
    new FieldComparator(),
  )

  const makeMatrixSurvey = (subquestions: Partial<SurveySubquestionData>[]) =>
    new Survey({
      createdById: 'user1',
      elements: [
        {
          code: 'Q1',
          type: 'matrixComposite',
          text: { en: 'Matrix Question' },
          createdById: 'user1',
          surveyId: 'survey1',
          subquestions,
        },
      ],
    })

  describe('subquestion type comparison', () => {
    test('detects type change as modified difference', () => {
      const surveyA = makeMatrixSurvey([
        { code: 'S1', type: 'text', text: { en: 'Column' } },
      ])
      const surveyB = makeMatrixSurvey([
        { code: 'S1', type: 'number', text: { en: 'Column' } },
      ])

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const questionDiff = diffs.find((d) => d.itemId === 'Q1')
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].subquestions[S1].type',
        type: 'modified',
        oldValue: 'text',
        newValue: 'number',
      })
    })

    test('produces no difference when types are identical', () => {
      const surveyA = makeMatrixSurvey([
        { code: 'S1', type: 'number', text: { en: 'Column' } },
      ])
      const surveyB = makeMatrixSurvey([
        { code: 'S1', type: 'number', text: { en: 'Column' } },
      ])

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const typeDiff = diffs
        .flatMap((d) => d.differences ?? [])
        .find((d) => d.path.endsWith('.type'))
      expect(typeDiff).toBeUndefined()
    })
  })

  describe('subquestion attributes comparison', () => {
    test('detects attribute value change', () => {
      const surveyA = makeMatrixSurvey([
        {
          code: 'S1',
          type: 'text',
          text: { en: 'Column' },
          attributes: { required: false },
        },
      ])
      const surveyB = makeMatrixSurvey([
        {
          code: 'S1',
          type: 'text',
          text: { en: 'Column' },
          attributes: { required: true },
        },
      ])

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const questionDiff = diffs.find((d) => d.itemId === 'Q1')
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].subquestions[S1].attributes.required',
          type: 'modified',
          oldValue: false,
          newValue: true,
        }),
      )
    })

    test('produces no difference when attributes are identical', () => {
      const surveyA = makeMatrixSurvey([
        {
          code: 'S1',
          type: 'text',
          text: { en: 'Column' },
          attributes: { required: true },
        },
      ])
      const surveyB = makeMatrixSurvey([
        {
          code: 'S1',
          type: 'text',
          text: { en: 'Column' },
          attributes: { required: true },
        },
      ])

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const attrDiff = diffs
        .flatMap((d) => d.differences ?? [])
        .find((d) => d.path.includes('.attributes.'))
      expect(attrDiff).toBeUndefined()
    })
  })

  describe('regression: condition comparison', () => {
    const makeConditionSurvey = (condition: string | null) =>
      new Survey({
        createdById: 'user1',
        sections: [
          {
            code: 'G1',
            name: { en: 'Group' },
            createdById: 'user1',
            surveyId: 'survey1',
            condition,
          },
        ],
        elements: [
          {
            code: 'Q1',
            type: 'text',
            text: { en: 'Question' },
            createdById: 'user1',
            surveyId: 'survey1',
            condition,
          },
        ],
      })

    test('detects question condition value change', () => {
      const surveyA = makeConditionSurvey('city === "London"')
      const surveyB = makeConditionSurvey('city === "Liverpool"')

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const questionDiff = diffs.find((d) => d.itemId === 'Q1')
      expect(questionDiff?.differences).toContainEqual({
        path: 'questions[Q1].condition',
        type: 'modified',
        oldValue: 'city === "London"',
        newValue: 'city === "Liverpool"',
      })
    })

    test('detects group condition value change', () => {
      const surveyA = makeConditionSurvey('city === "London"')
      const surveyB = makeConditionSurvey('city === "Liverpool"')

      const diffs = comparator.compareQuestionGroups(surveyA, surveyB)

      const groupDiff = diffs.find((d) => d.itemId === 'G1')
      expect(groupDiff?.differences).toContainEqual({
        path: 'groups[G1].condition',
        type: 'modified',
        oldValue: 'city === "London"',
        newValue: 'city === "Liverpool"',
      })
    })

    test('produces no difference when condition is identical', () => {
      const surveyA = makeConditionSurvey('city === "London"')
      const surveyB = makeConditionSurvey('city === "London"')

      const questionDiffs = comparator.compareQuestions(surveyA, surveyB)
      const groupDiffs = comparator.compareQuestionGroups(surveyA, surveyB)

      expect(questionDiffs).toHaveLength(0)
      expect(groupDiffs).toHaveLength(0)
    })
  })

  describe('regression: added/removed subquestions', () => {
    test('detects added subquestion', () => {
      const surveyA = makeMatrixSurvey([])
      const surveyB = makeMatrixSurvey([
        { code: 'S1', type: 'text', text: { en: 'Column' } },
      ])

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const questionDiff = diffs.find((d) => d.itemId === 'Q1')
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].subquestions[S1]',
          type: 'added',
        }),
      )
    })

    test('detects removed subquestion', () => {
      const surveyA = makeMatrixSurvey([
        { code: 'S1', type: 'text', text: { en: 'Column' } },
      ])
      const surveyB = makeMatrixSurvey([])

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const questionDiff = diffs.find((d) => d.itemId === 'Q1')
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].subquestions[S1]',
          type: 'removed',
        }),
      )
    })
  })

  describe('regression: answer option image comparison', () => {
    const makeImageSurvey = (
      image: Record<string, SurveyAnswerOptionImageValue | null> | null,
    ) =>
      new Survey({
        createdById: 'user1',
        elements: [
          {
            code: 'Q1',
            type: 'imageSelect',
            text: { en: 'Pick one' },
            createdById: 'user1',
            surveyId: 'survey1',
            answerOptions: [
              {
                code: 'A1',
                label: new L10n({ en: 'Option 1' }),
                image,
              },
            ],
          },
        ],
      })

    test('detects added answer option image', () => {
      const surveyA = makeImageSurvey(null)
      const surveyB = makeImageSurvey({
        en: { path: 'img.png', fileId: 'file1' },
      })

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const questionDiff = diffs.find((d) => d.itemId === 'Q1')
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].answerOptions[A1].image',
          type: 'added',
        }),
      )
    })

    test('detects removed answer option image', () => {
      const surveyA = makeImageSurvey({
        en: { path: 'img.png', fileId: 'file1' },
      })
      const surveyB = makeImageSurvey(null)

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const questionDiff = diffs.find((d) => d.itemId === 'Q1')
      expect(questionDiff?.differences).toContainEqual(
        expect.objectContaining({
          path: 'questions[Q1].answerOptions[A1].image',
          type: 'removed',
        }),
      )
    })

    test('produces no difference when images are identical', () => {
      const image = { en: { path: 'img.png', fileId: 'file1' } }
      const surveyA = makeImageSurvey(image)
      const surveyB = makeImageSurvey(image)

      const diffs = comparator.compareQuestions(surveyA, surveyB)

      const imageDiff = diffs
        .flatMap((d) => d.differences ?? [])
        .find((d) => d.path.includes('.image'))
      expect(imageDiff).toBeUndefined()
    })
  })

  describe('compareSections (welcome / thank-you singletons)', () => {
    const bareSurvey = () => new Survey({ _id: 's1', createdById: 'user1' })

    test('returns nothing when neither survey has welcome/thank-you sections', () => {
      expect(comparator.compareSections(bareSurvey(), bareSurvey())).toEqual([])
    })

    test('detects an added welcome section', () => {
      const surveyB = bareSurvey().updateWelcomeSectionDesc('<p>Hi</p>', 'en')

      const diffs = comparator.compareSections(bareSurvey(), surveyB)

      expect(diffs).toHaveLength(1)
      expect(diffs[0]).toMatchObject({
        path: 'sections[WELCOME]',
        type: 'added',
        itemId: 'WELCOME',
        itemType: 'section',
      })
    })

    test('detects a removed thank-you section', () => {
      const surveyA = bareSurvey().updateThankYouSectionDesc('<p>Bye</p>', 'en')

      const diffs = comparator.compareSections(surveyA, bareSurvey())

      expect(diffs).toHaveLength(1)
      expect(diffs[0]).toMatchObject({
        path: 'sections[THANKYOU]',
        type: 'removed',
        itemId: 'THANKYOU',
        itemType: 'section',
      })
    })

    test('detects a modified welcome section desc', () => {
      const surveyA = bareSurvey().updateWelcomeSectionDesc('<p>Hi</p>', 'en')
      const surveyB = bareSurvey().updateWelcomeSectionDesc(
        '<p>Hello</p>',
        'en',
      )

      const diffs = comparator.compareSections(surveyA, surveyB)

      expect(diffs).toHaveLength(1)
      expect(diffs[0]).toMatchObject({
        path: 'sections[WELCOME]',
        type: 'modified',
        itemType: 'section',
      })
      expect(diffs[0].differences).toContainEqual(
        expect.objectContaining({
          path: 'sections[WELCOME].desc.en',
          type: 'modified',
          oldValue: '<p>Hi</p>',
          newValue: '<p>Hello</p>',
        }),
      )
    })

    test('detects a modified thank-you link url', () => {
      const surveyA = bareSurvey().updateThankYouSectionLinkUrl(
        'https://a.example',
        'en',
      )
      const surveyB = bareSurvey().updateThankYouSectionLinkUrl(
        'https://b.example',
        'en',
      )

      const diffs = comparator.compareSections(surveyA, surveyB)

      expect(diffs[0].differences).toContainEqual(
        expect.objectContaining({
          path: 'sections[THANKYOU].config.link.url.en',
          type: 'modified',
          oldValue: 'https://a.example',
          newValue: 'https://b.example',
        }),
      )
    })
  })
})
