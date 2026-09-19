import { migrateLegacySurveyJson } from './migrateLegacySurveyJson'
import { migrateLegacySurveyLanguageData } from './migrateLegacySurveyLanguageData'

describe('migrateLegacySurveyJson', () => {
  const legacySurvey = (): Record<string, unknown> => ({
    _id: 'SRV1',
    createdById: 'USR1',
    name: 'Test',
    groupIds: ['G001'],
    questionIds: ['Q001', 'Q002'],
    groups: [
      {
        _id: 'G001',
        surveyId: 'SRV1',
        createdById: 'USR1',
        code: 'G001',
        name: { en: 'Group' },
        questionIds: ['Q001'],
      },
    ],
    questions: [
      {
        _id: 'Q001',
        surveyId: 'SRV1',
        createdById: 'USR1',
        code: 'Q001',
        type: 'text',
        groupId: 'G001',
        text: { en: 'Q1' },
      },
      {
        _id: 'Q002',
        surveyId: 'SRV1',
        createdById: 'USR1',
        code: 'Q002',
        type: 'text',
        groupId: 'G001',
        text: { en: 'Q2' },
      },
    ],
    content: { htmlAllowed: true },
    welcome: { message: { en: '<p>Welcome</p>' } },
    thankYou: {
      message: { en: '<p>Thanks</p>' },
      link: { url: { en: 'https://x.test' }, text: { en: 'Back' } },
    },
  })

  it('renames the top-level collection and id-order keys', () => {
    const out = migrateLegacySurveyJson(legacySurvey())
    expect(out).not.toHaveProperty('groups')
    expect(out).not.toHaveProperty('questions')
    expect(out).not.toHaveProperty('groupIds')
    expect(out).not.toHaveProperty('questionIds')
    expect(out).not.toHaveProperty('content')
    expect(out.contentFormat).toEqual({ htmlAllowed: true })
    expect(out.elementIds).toEqual(['Q001', 'Q002'])
  })

  it('adds kind and rewrites groupId -> sectionId on elements', () => {
    const out = migrateLegacySurveyJson(legacySurvey())
    for (const el of out.elements as Array<Record<string, unknown>>) {
      expect(el.kind).toBe('question')
      expect(el.sectionId).toBe('G001')
      expect(el).not.toHaveProperty('groupId')
    }
  })

  it('adds kind and drops vestigial questionIds on sections', () => {
    const out = migrateLegacySurveyJson(legacySurvey())
    const group = (out.sections as Array<Record<string, unknown>>).find(
      (s) => s.code === 'G001',
    )
    expect(group?.kind).toBe('group')
    expect(group).not.toHaveProperty('questionIds')
  })

  it('folds welcome/thank-you into singleton sections at the ends', () => {
    const out = migrateLegacySurveyJson(legacySurvey())
    const sections = out.sections as Array<Record<string, unknown>>
    expect(sections[0]).toMatchObject({
      _id: 'WELCOME',
      code: 'WELCOME',
      kind: 'welcome',
      desc: { en: '<p>Welcome</p>' },
    })
    const ty = sections[sections.length - 1]
    expect(ty).toMatchObject({
      _id: 'THANKYOU',
      kind: 'thankYou',
      desc: { en: '<p>Thanks</p>' },
    })
    expect(ty.config).toEqual({
      link: { url: { en: 'https://x.test' }, text: { en: 'Back' } },
    })
    expect(out.sectionIds).toEqual(['WELCOME', 'G001', 'THANKYOU'])
  })

  it('is idempotent', () => {
    const once = migrateLegacySurveyJson(legacySurvey())
    const twice = migrateLegacySurveyJson(JSON.parse(JSON.stringify(once)))
    expect(twice).toEqual(once)
  })

  it('leaves an empty welcome/thank-you absent', () => {
    const survey = legacySurvey()
    survey.welcome = { message: {} }
    survey.thankYou = { message: {}, link: { url: {}, text: {} } }
    const out = migrateLegacySurveyJson(survey) as Record<string, unknown>
    expect((out.sections as unknown[]).length).toBe(1)
    expect(out.sectionIds).toEqual(['G001'])
  })
})

describe('migrateLegacySurveyLanguageData', () => {
  it('renames groups/questions and welcome/thank-you keys', () => {
    const out = migrateLegacySurveyLanguageData({
      title: 'T',
      welcomeMessage: 'W',
      thankYouMessage: 'TY',
      thankYouLinkUrl: 'U',
      thankYouLinkText: 'X',
      groups: { G001: { name: 'g' } },
      questions: { Q001: { text: 'q' } },
      subquestions: { S1: { text: 's' } },
    })
    expect(out).not.toHaveProperty('groups')
    expect(out).not.toHaveProperty('questions')
    expect(out).not.toHaveProperty('welcomeMessage')
    expect(out.sections).toEqual({ G001: { name: 'g' } })
    expect(out.elements).toEqual({ Q001: { text: 'q' } })
    expect(out.welcomeSectionDesc).toBe('W')
    expect(out.thankYouSectionLinkText).toBe('X')
    expect(out.subquestions).toEqual({ S1: { text: 's' } })
  })

  it('is idempotent', () => {
    const once = migrateLegacySurveyLanguageData({
      groups: { G: {} },
      questions: { Q: {} },
    })
    const twice = migrateLegacySurveyLanguageData(
      JSON.parse(JSON.stringify(once)),
    )
    expect(twice).toEqual(once)
  })
})
