import { Patch } from 'veysur-common'

import { buildPatchContext } from 'test-utils/buildPatchContext'
import { handleSurveyUpdate } from './surveyUpdate'

describe('handleSurveyUpdate bot protection secrets', () => {
  const buildContext = () => {
    const findOne = jest.fn().mockResolvedValue({
      botProtection: {
        cloudflare: { siteKey: 'old-site', secretKey: 'stored-secret' },
      },
    })
    const updateOne = jest.fn().mockResolvedValue(undefined)
    const built = buildPatchContext({
      repos: { repoSurvey: { findOne, updateOne } },
    })
    return { ctx: built.ctx, updateOne }
  }

  const surveyPatch = (data: Record<string, unknown>): Patch => ({
    type: 'survey',
    action: 'update',
    id: 'survey-1',
    data,
  })

  const savedFields = (updateOne: jest.Mock) => updateOne.mock.calls[0][1].$set

  it('keeps the stored secret when a dotted secret write is blank', async () => {
    const { ctx, updateOne } = buildContext()

    await handleSurveyUpdate(
      surveyPatch({ 'botProtection.cloudflare.secretKey': '' }),
      ctx,
    )

    expect(Object.keys(savedFields(updateOne))).not.toContain(
      'botProtection.cloudflare.secretKey',
    )
  })

  it('stores a typed secret and a null (inherit) secret as sent', async () => {
    const { ctx, updateOne } = buildContext()

    await handleSurveyUpdate(
      surveyPatch({
        'botProtection.cloudflare.secretKey': 'new-secret',
        'botProtection.google.secretKey': null,
      }),
      ctx,
    )

    const saved = savedFields(updateOne)
    expect(saved['botProtection.cloudflare.secretKey']).toBe('new-secret')
    expect(saved['botProtection.google.secretKey']).toBeNull()
  })

  it('merges a whole-object write against the stored survey secret', async () => {
    const { ctx, updateOne } = buildContext()

    await handleSurveyUpdate(
      surveyPatch({
        botProtection: {
          provider: 'cloudflare',
          cloudflare: { siteKey: 'new-site', secretKey: '' },
        },
      }),
      ctx,
    )

    expect(savedFields(updateOne).botProtection.cloudflare).toEqual({
      siteKey: 'new-site',
      secretKey: 'stored-secret',
    })
  })
})
