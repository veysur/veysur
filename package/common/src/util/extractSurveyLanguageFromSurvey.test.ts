// cspell:disable
import { Survey } from '../model/constructor/Survey'
import { SurveyLanguage } from '../model/constructor/SurveyLanguage'
import { L10n } from '../model/constructor/L10n'
import { extractSurveyLanguageFromSurvey } from './extractSurveyLanguageFromSurvey'
import { mergeSurveyLanguageIntoSurvey } from './mergeSurveyLanguageIntoSurvey'

function makeMultiLangSurvey(): Survey {
  return new Survey({
    _id: 's1',
    createdById: 'u1',
    name: 'Test Survey',
    title: { en: 'My Survey', fr: 'Mon Enquête' },
    sections: [
      {
        _id: 'WELCOME',
        surveyId: 's1',
        createdById: 'u1',
        code: 'WELCOME',
        kind: 'welcome',
        desc: { en: 'Welcome', fr: 'Bienvenue' },
      },
      {
        _id: 'g1',
        surveyId: 's1',
        createdById: 'u1',
        code: 'G001',
        name: { en: 'Group One', fr: 'Groupe Un' },
      },
    ],
    sectionIds: ['WELCOME', 'g1'],
    elements: [
      {
        _id: 'q1',
        surveyId: 's1',
        createdById: 'u1',
        type: 'text',
        code: 'Q001',
        sectionId: 'g1',
        text: { en: 'Question One', fr: 'Question Un' },
        answerOptions: [
          {
            _id: 'a1',
            createdById: 'u1',
            code: 'A001',
            label: new L10n({ en: 'Option One', fr: 'Option Un' }),
          },
        ],
      },
    ],
    elementIds: ['q1'],
  })
}

describe('extractSurveyLanguageFromSurvey', () => {
  it('extracts only the requested language values', () => {
    const survey = makeMultiLangSurvey()
    const extracted = extractSurveyLanguageFromSurvey(survey, 's1', 'fr')

    expect(extracted).toBeInstanceOf(SurveyLanguage)
    expect(extracted.languageCode).toBe('fr')
    expect(extracted.data.title).toBe('Mon Enquête')
    // Legacy `welcome: { message }` input folds into the welcome section.
    expect(extracted.data.welcomeSectionDesc).toBe('Bienvenue')
    expect(extracted.data.sections?.g1?.name).toBe('Groupe Un')
    expect(extracted.data.elements?.q1?.text).toBe('Question Un')
    expect(extracted.data.answerOptions?.a1?.label).toBe('Option Un')
  })

  it('does not extract values from a different language', () => {
    const survey = makeMultiLangSurvey()
    const extracted = extractSurveyLanguageFromSurvey(survey, 's1', 'fr')

    expect(extracted.data.title).not.toBe('My Survey')
    expect(extracted.data.welcomeMessage).not.toBe('Welcome')
  })

  it('extracts content-element text for the requested language only', () => {
    const survey = makeMultiLangSurvey().addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      text: { en: 'Intro', fr: 'Intro FR' },
    })

    expect(
      extractSurveyLanguageFromSurvey(survey, 's1', 'fr').data.elements?.c1,
    ).toEqual({ text: 'Intro FR' })
    expect(
      extractSurveyLanguageFromSurvey(survey, 's1', 'de').data.elements?.c1,
    ).toBeUndefined()
  })

  it('extracts welcome / thank-you section text per language', () => {
    const survey = makeMultiLangSurvey()
      .updateWelcomeSectionDesc('Welcome', 'en')
      .updateWelcomeSectionDesc('Bienvenue', 'fr')
      .updateThankYouSectionDesc('Thanks', 'en')
      .updateThankYouSectionLinkText('Next', 'en')

    const en = extractSurveyLanguageFromSurvey(survey, 's1', 'en')
    expect(en.data.welcomeSectionDesc).toBe('Welcome')
    expect(en.data.thankYouSectionDesc).toBe('Thanks')
    expect(en.data.thankYouSectionLinkText).toBe('Next')

    const fr = extractSurveyLanguageFromSurvey(survey, 's1', 'fr')
    expect(fr.data.welcomeSectionDesc).toBe('Bienvenue')
    expect(fr.data.thankYouSectionDesc).toBeUndefined()
  })

  it('emits no section keys for a survey without welcome / thank-you sections', () => {
    const bare = new Survey({ _id: 's1', createdById: 'u1' })
    const data = extractSurveyLanguageFromSurvey(bare, 's1', 'en').data
    expect(data.welcomeSectionDesc).toBeUndefined()
    expect(data.thankYouSectionDesc).toBeUndefined()
    expect(data.thankYouSectionLinkText).toBeUndefined()
  })

  it('produces empty text when the language has no values', () => {
    const survey = makeMultiLangSurvey()
    const extracted = extractSurveyLanguageFromSurvey(survey, 's1', 'de')

    expect(extracted.data).toEqual({})
  })

  it('roundtrips: extract then merge produces the same L10n values', () => {
    const survey = makeMultiLangSurvey()

    // Extract both languages
    const enLang = extractSurveyLanguageFromSurvey(survey, 's1', 'en')
    const frLang = extractSurveyLanguageFromSurvey(survey, 's1', 'fr')

    // Build a sparse survey (no L10n) and merge both languages back in
    const sparseSurvey = new Survey({
      _id: 's1',
      createdById: 'u1',
      name: 'Test Survey',
      sections: [
        {
          _id: 'g1',
          surveyId: 's1',
          createdById: 'u1',
          code: 'G001',
          name: {},
        },
      ],
      sectionIds: ['g1'],
      elements: [
        {
          _id: 'q1',
          surveyId: 's1',
          createdById: 'u1',
          type: 'text',
          code: 'Q001',
          sectionId: 'g1',
          text: {},
          answerOptions: [
            { _id: 'a1', createdById: 'u1', code: 'A001', label: new L10n() },
          ],
        },
      ],
      elementIds: ['q1'],
    })
      .ensureWelcomeSection()
      .ensureThankYouSection()

    const merged = mergeSurveyLanguageIntoSurvey(sparseSurvey, [enLang, frLang])

    expect(merged.title.en).toBe('My Survey')
    expect(merged.title.fr).toBe('Mon Enquête')
    expect(merged.welcomeSection?.desc?.en).toBe('Welcome')
    expect(merged.welcomeSection?.desc?.fr).toBe('Bienvenue')
    expect(merged.sections.groups().getById('g1')?.name.en).toBe('Group One')
    expect(merged.sections.groups().getById('g1')?.name.fr).toBe('Groupe Un')
    expect(merged.elements.getQuestionById('q1')?.text.en).toBe('Question One')
    expect(merged.elements.getQuestionById('q1')?.text.fr).toBe('Question Un')
    expect(
      merged.elements.getQuestionById('q1')?.answerOptions?.getById('a1')?.label
        .en,
    ).toBe('Option One')
    expect(
      merged.elements.getQuestionById('q1')?.answerOptions?.getById('a1')?.label
        .fr,
    ).toBe('Option Un')
  })
})
