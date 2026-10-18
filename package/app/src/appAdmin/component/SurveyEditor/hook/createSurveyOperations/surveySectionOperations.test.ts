import { Survey, Patch } from 'veysur-common'

import {
  createSurveyBotProtectionOperations,
  createSurveyMapsOperations,
} from './surveySectionOperations'

describe('survey maps and bot protection operations', () => {
  let survey: Survey
  let patches: Patch[]

  const deps = () => ({
    updateSurveyState: (updater: (s: Survey) => Survey) => {
      survey = updater(survey)
    },
    bufferPatches: jest.fn(),
    setSurveyFocus: jest.fn(),
    validateAndBuffer: ({ patches: p }: { patches: Patch[] }) => {
      patches.push(...p)
    },
  })

  beforeEach(() => {
    survey = new Survey({ _id: 's1', createdById: 'u1', name: 'Test' })
    patches = []
  })

  it('sets a survey map key and patches only that field', () => {
    createSurveyMapsOperations(deps()).updateSurveyMapsSetting(
      'googleApiKey',
      'survey-key',
    )

    expect(survey.maps?.googleApiKey).toBe('survey-key')
    expect(patches[0].data).toEqual({ 'maps.googleApiKey': 'survey-key' })
  })

  it('edits one field of a provider key pair', () => {
    const ops = createSurveyBotProtectionOperations(deps())

    ops.updateSurveyBotProtectionSetting('cloudflare.siteKey', 'site')
    ops.updateSurveyBotProtectionSetting('cloudflare.siteKey', null)

    expect(survey.botProtection?.cloudflare?.siteKey).toBeNull()
    expect(patches.map((p) => p.data)).toEqual([
      { 'botProtection.cloudflare.siteKey': 'site' },
      { 'botProtection.cloudflare.siteKey': null },
    ])
  })

  it('sets the provider, and null returns it to the project default', () => {
    const ops = createSurveyBotProtectionOperations(deps())

    ops.updateSurveyBotProtectionSetting('provider', 'google')
    expect(survey.botProtection?.provider).toBe('google')

    ops.updateSurveyBotProtectionSetting('provider', null)
    expect(survey.botProtection?.provider).toBeNull()
  })
})
