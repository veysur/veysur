// cspell:disable
import { Survey } from '../model/constructor/Survey'
import { SurveyData } from '../model/constructor/Survey/SurveyBase'
import { SurveyLanguage } from '../model/constructor/SurveyLanguage'
import { L10n } from '../model/constructor/L10n'
import { mergeSurveyLanguageIntoSurvey } from './mergeSurveyLanguageIntoSurvey'

function makeSurvey(overrides: Partial<SurveyData> = {}): Survey {
  return new Survey({
    _id: 's1',
    createdById: 'u1',
    name: 'Test Survey',
    sections: [
      {
        _id: 'g1',
        surveyId: 's1',
        createdById: 'u1',
        code: 'G001',
        name: { en: 'Group One' },
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
        text: { en: 'Question One' },
        answerOptions: [
          {
            _id: 'a1',
            createdById: 'u1',
            code: 'A001',
            label: new L10n({ en: 'Option One' }),
          },
        ],
      },
    ],
    elementIds: ['q1'],
    ...overrides,
  })
}

function makeLang(
  languageCode: string,
  data: SurveyLanguage['data'],
): SurveyLanguage {
  return new SurveyLanguage({
    surveyId: 's1',
    languageCode,
    data,
  })
}

describe('mergeSurveyLanguageIntoSurvey', () => {
  it('returns the same survey when languages array is empty', () => {
    const survey = makeSurvey()
    const result = mergeSurveyLanguageIntoSurvey(survey, [])
    expect(result).toBe(survey)
  })

  it('merges survey-level L10n fields for a single language', () => {
    const survey = makeSurvey().ensureWelcomeSection()
    const lang = makeLang('fr', {
      title: 'Enquête test',
      welcomeSectionDesc: 'Bienvenue!',
    })

    const result = mergeSurveyLanguageIntoSurvey(survey, [lang])

    expect(result.title.fr).toBe('Enquête test')
    expect(result.title.en).toBeUndefined()
    expect(result.welcomeSection?.desc?.fr).toBe('Bienvenue!')
  })

  it('merges two languages into the same L10n fields', () => {
    const survey = makeSurvey()
    const en = makeLang('en', { title: 'Test Survey' })
    const fr = makeLang('fr', { title: 'Enquête test' })

    const result = mergeSurveyLanguageIntoSurvey(survey, [en, fr])

    expect(result.title.en).toBe('Test Survey')
    expect(result.title.fr).toBe('Enquête test')
  })

  it('merges group name for a single language', () => {
    const survey = makeSurvey()
    const lang = makeLang('fr', { sections: { g1: { name: 'Groupe Un' } } })

    const result = mergeSurveyLanguageIntoSurvey(survey, [lang])

    expect(result.sections.groups().getById('g1')?.name.fr).toBe('Groupe Un')
    expect(result.sections.groups().getById('g1')?.name.en).toBe('Group One')
  })

  it('merges question text and answer option label', () => {
    const survey = makeSurvey()
    const lang = makeLang('fr', {
      elements: { q1: { text: 'Question Un' } },
      answerOptions: { a1: { label: 'Option Un' } },
    })

    const result = mergeSurveyLanguageIntoSurvey(survey, [lang])

    const q = result.elements.getQuestionById('q1')
    expect(q?.text.fr).toBe('Question Un')
    expect(q?.text.en).toBe('Question One')

    const ao = q?.answerOptions?.getById('a1')
    expect(ao?.label.fr).toBe('Option Un')
    expect(ao?.label.en).toBe('Option One')
  })

  it('merges content-element text back into the survey', () => {
    const survey = makeSurvey().addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      text: { en: 'Intro' },
    })
    const lang = makeLang('de', { elements: { c1: { text: 'Intro DE' } } })

    const result = mergeSurveyLanguageIntoSurvey(survey, [lang])

    const ce = result.contents.find((c) => c._id === 'c1')
    expect(ce?.text.en).toBe('Intro')
    expect(ce?.text.de).toBe('Intro DE')
  })

  it('keeps content elements when merging a question-only language record', () => {
    const survey = makeSurvey().addContent('g1', {
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      text: { en: 'Intro' },
    })
    const lang = makeLang('de', { elements: { q1: { text: 'Frage Eins' } } })

    const result = mergeSurveyLanguageIntoSurvey(survey, [lang])

    expect(result.contents).toHaveLength(1)
    expect(result.elements.getQuestionById('q1')?.text.de).toBe('Frage Eins')
  })

  it('merges welcome / thank-you section text back into the survey', () => {
    const survey = makeSurvey()
      .updateWelcomeSectionDesc('Welcome', 'en')
      .updateThankYouSectionLinkText('Next', 'en')
    const lang = makeLang('de', {
      welcomeSectionDesc: 'Willkommen',
      thankYouSectionLinkText: 'Weiter',
    })

    const result = mergeSurveyLanguageIntoSurvey(survey, [lang])

    expect(result.welcomeSection?.desc?.en).toBe('Welcome')
    expect(result.welcomeSection?.desc?.de).toBe('Willkommen')
    expect(result.thankYouSection?.config?.link?.text.en).toBe('Next')
    expect(result.thankYouSection?.config?.link?.text.de).toBe('Weiter')
  })

  it('keeps welcome / thank-you sections when merging a group-only record', () => {
    const survey = makeSurvey().ensureWelcomeSection().ensureThankYouSection()
    const lang = makeLang('de', { sections: { g1: { name: 'Gruppe' } } })

    const result = mergeSurveyLanguageIntoSurvey(survey, [lang])

    expect(result.welcomeSection).toBeDefined()
    expect(result.thankYouSection).toBeDefined()
    expect(result.sections.groups().getById('g1')?.name.de).toBe('Gruppe')
  })

  it('silently skips unknown groupId in text', () => {
    const survey = makeSurvey()
    const lang = makeLang('fr', {
      sections: { 'unknown-id': { name: 'Ghost' } },
    })
    expect(() => mergeSurveyLanguageIntoSurvey(survey, [lang])).not.toThrow()
  })

  it('silently skips unknown questionId in text', () => {
    const survey = makeSurvey()
    const lang = makeLang('fr', {
      elements: { 'unknown-id': { text: 'Ghost' } },
    })
    expect(() => mergeSurveyLanguageIntoSurvey(survey, [lang])).not.toThrow()
  })

  it('does not modify original survey instance', () => {
    const survey = makeSurvey()
    const lang = makeLang('fr', { title: 'Enquête test' })
    mergeSurveyLanguageIntoSurvey(survey, [lang])
    expect(survey.title.fr).toBeUndefined()
  })
})
