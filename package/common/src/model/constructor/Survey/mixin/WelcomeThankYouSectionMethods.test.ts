// cspell:disable
import { Survey } from '../../Survey'
import {
  SECTION_KIND_GROUP,
  SECTION_KIND_WELCOME,
  SECTION_KIND_THANK_YOU,
  SECTION_CODE_WELCOME,
} from '../SurveySection'

function makeSurvey(): Survey {
  return new Survey({
    _id: 's1',
    createdById: 'u1',
    name: 'Test',
    sections: [
      {
        _id: 'g1',
        surveyId: 's1',
        createdById: 'u1',
        code: 'G001',
        name: { en: 'One' },
      },
      {
        _id: 'g2',
        surveyId: 's1',
        createdById: 'u1',
        code: 'G002',
        name: { en: 'Two' },
      },
    ],
    sectionIds: ['g1', 'g2'],
  })
}

describe('WelcomeThankYouSectionMethods', () => {
  it('has no welcome/thank-you section on a plain survey', () => {
    const survey = makeSurvey()
    expect(survey.welcomeSection).toBeUndefined()
    expect(survey.thankYouSection).toBeUndefined()
  })

  it('ensureWelcomeSection is idempotent and pins the section first', () => {
    const once = makeSurvey().ensureWelcomeSection()
    expect(once.welcomeSection?.kind).toBe(SECTION_KIND_WELCOME)
    expect(once.welcomeSection?.code).toBe(SECTION_CODE_WELCOME)
    expect(once.sectionIds[0]).toBe(once.welcomeSection?._id)

    const twice = once.ensureWelcomeSection()
    expect(
      twice.sections.filter((s) => s.kind === SECTION_KIND_WELCOME),
    ).toHaveLength(1)
    expect(twice.sectionIds).toEqual(once.sectionIds)
  })

  it('ensureThankYouSection pins the section last', () => {
    const survey = makeSurvey().ensureThankYouSection()
    expect(survey.thankYouSection?.kind).toBe(SECTION_KIND_THANK_YOU)
    expect(survey.sectionIds[survey.sectionIds.length - 1]).toBe(
      survey.thankYouSection?._id,
    )
  })

  it('updateWelcomeSectionDesc creates then mutates, keeping other languages', () => {
    const survey = makeSurvey()
      .updateWelcomeSectionDesc('Hello', 'en')
      .updateWelcomeSectionDesc('Hallo', 'de')
    expect(survey.welcomeSection?.desc?.en).toBe('Hello')
    expect(survey.welcomeSection?.desc?.de).toBe('Hallo')
  })

  it('thank-you section link set and clear', () => {
    let survey = makeSurvey()
      .updateThankYouSectionLinkUrl('https://x.test', 'en')
      .updateThankYouSectionLinkText('Continue', 'en')
    expect(survey.thankYouSection?.config?.link?.url.en).toBe('https://x.test')
    expect(survey.thankYouSection?.config?.link?.text.en).toBe('Continue')

    survey = survey.clearThankYouSectionLink()
    expect(survey.thankYouSection?.config?.link ?? null).toBeNull()
  })

  it('applySortOrder pins welcome first / thank-you last regardless of sectionIds order', () => {
    const survey = makeSurvey().ensureWelcomeSection().ensureThankYouSection()
    // Scramble sectionIds so welcome/thankYou are in the middle.
    const scrambled = survey.newInstance({
      sectionIds: [
        'g1',
        survey.welcomeSection!._id,
        survey.thankYouSection!._id,
        'g2',
      ],
    })
    const sorted = scrambled.applySortOrder()
    expect(sorted.sections[0].kind).toBe(SECTION_KIND_WELCOME)
    expect(sorted.sections[sorted.sections.length - 1].kind).toBe(
      SECTION_KIND_THANK_YOU,
    )
    expect(sorted.sections[1].kind).toBe(SECTION_KIND_GROUP)
    expect(sorted.sectionIds).toEqual(sorted.sections.map((s) => s._id))
  })
})
