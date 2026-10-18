import { Survey } from '../../Survey'
import { SettingSurvey } from '../../SettingSurvey'

describe('Survey GetterMethods - getContentFormat', () => {
  test('inherits project default when survey content is null', () => {
    const survey = new Survey({ _id: '1', createdById: 'u1', name: 'Test' })
    const defaults = new SettingSurvey({ _id: 's1' }).updateContentFormat({
      htmlAllowed: true,
      markdownAllowed: false,
      scriptTagsAllowed: true,
    })

    expect(survey.getContentFormat(defaults)).toEqual({
      htmlAllowed: true,
      markdownAllowed: false,
      scriptTagsAllowed: true,
    })
  })

  test('survey-level override wins over project default', () => {
    const survey = new Survey({
      _id: '1',
      createdById: 'u1',
      name: 'Test',
      contentFormat: { htmlAllowed: false, markdownAllowed: true },
    })
    const defaults = new SettingSurvey({ _id: 's1' }).updateContentFormat({
      htmlAllowed: true,
      markdownAllowed: false,
    })

    expect(survey.getContentFormat(defaults)).toEqual({
      htmlAllowed: false,
      markdownAllowed: true,
      scriptTagsAllowed: defaults.contentFormat.scriptTagsAllowed,
    })
  })
})

describe('Survey GetterMethods - maps and botProtection', () => {
  const defaults = new SettingSurvey({ _id: 's1' })
    .updateMaps({ googleApiKey: 'project-key' })
    .updateBotProtection({
      provider: 'cloudflare',
      cloudflare: { siteKey: 'project-site', secretKey: 'project-secret' },
    })

  test('inherits the project values when the survey has none', () => {
    const survey = new Survey({ _id: '1', createdById: 'u1', name: 'Test' })

    expect(survey.getMaps(defaults).googleApiKey).toBe('project-key')
    expect(survey.getBotProtection(defaults)).toMatchObject({
      provider: 'cloudflare',
      cloudflare: { siteKey: 'project-site', secretKey: 'project-secret' },
    })
  })

  test('overrides each field independently', () => {
    const survey = new Survey({ _id: '1', createdById: 'u1', name: 'Test' })
      .setMapsProperty('googleApiKey', 'survey-key')
      .setBotProtectionProperty('cloudflare', {
        siteKey: 'survey-site',
        secretKey: null,
      })

    expect(survey.getMaps(defaults).googleApiKey).toBe('survey-key')
    expect(survey.getBotProtection(defaults).cloudflare).toEqual({
      siteKey: 'survey-site',
      secretKey: 'project-secret',
    })
    expect(survey.getBotProtection(defaults).provider).toBe('cloudflare')
  })
})
