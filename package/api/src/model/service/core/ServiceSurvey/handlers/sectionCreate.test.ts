import { Patch } from 'veysur-common'

import { handleSectionCreate } from './sectionCreate'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleSectionCreate', () => {
  let upsertFields: jest.Mock

  const buildContext = (findResult: unknown[] = []) => {
    const built = buildPatchContext({
      repos: {
        repoSurveySection: {
          find: jest.fn().mockResolvedValue(findResult),
          insertOne: jest.fn().mockResolvedValue(undefined),
        },
      },
    })
    upsertFields = built.l10n.upsertFields
    return built.ctx
  }

  it('creates a group when the code is unique', async () => {
    const ctx = buildContext([])

    const patch: Patch = {
      type: 'section',
      action: 'create',
      id: 'group-1',
      data: { _id: 'group-1', code: 'G001', name: { en: 'Group 1' } },
    }

    await expect(handleSectionCreate(patch, ctx)).resolves.toBeUndefined()
    expect(ctx.repos.repoSurveySection.insertOne).toHaveBeenCalled()
  })

  it('rejects a group code that duplicates an existing group', async () => {
    const ctx = buildContext([{ _id: 'group-2', code: 'G001' }])

    const patch: Patch = {
      type: 'section',
      action: 'create',
      id: 'group-1',
      data: { _id: 'group-1', code: 'G001', name: { en: 'Group 1' } },
    }

    await expect(handleSectionCreate(patch, ctx)).rejects.toMatchObject({
      code: ['Group with code "G001" already exists'],
    })
    expect(ctx.repos.repoSurveySection.insertOne).not.toHaveBeenCalled()
  })

  it('rejects an unknown section kind', async () => {
    const ctx = buildContext([])

    const patch: Patch = {
      type: 'section',
      action: 'create',
      id: 's1',
      data: { _id: 's1', code: 'X', kind: 'bogus' },
    }

    await expect(handleSectionCreate(patch, ctx)).rejects.toMatchObject({
      kind: ['Unknown section kind'],
    })
  })

  it('routes a welcome section desc to the flat welcomeSectionDesc key', async () => {
    const ctx = buildContext([])

    const patch: Patch = {
      type: 'section',
      action: 'create',
      id: 'w1',
      data: {
        _id: 'w1',
        code: 'WELCOME',
        kind: 'welcome',
        desc: { en: '<p>Hi</p>' },
      },
    }

    await handleSectionCreate(patch, ctx)

    const inserted = (ctx.repos.repoSurveySection.insertOne as jest.Mock).mock
      .calls[0][0]
    expect(inserted).toMatchObject({ _id: 'w1', kind: 'welcome' })
    expect(inserted).not.toHaveProperty('desc')
    expect(upsertFields).toHaveBeenCalledWith('survey-1', 'project-1', 'en', {
      welcomeSectionDesc: '<p>Hi</p>',
    })
  })

  it('routes thank-you link url/text to the flat SurveyLanguage keys', async () => {
    const ctx = buildContext([])

    const patch: Patch = {
      type: 'section',
      action: 'create',
      id: 't1',
      data: {
        _id: 't1',
        code: 'THANKYOU',
        kind: 'thankYou',
        config: {
          link: {
            url: { en: 'https://example.com' },
            text: { en: 'Visit us' },
          },
        },
      },
    }

    await handleSectionCreate(patch, ctx)

    const inserted = (ctx.repos.repoSurveySection.insertOne as jest.Mock).mock
      .calls[0][0]
    expect(inserted.config).toBeUndefined()
    expect(upsertFields).toHaveBeenCalledWith('survey-1', 'project-1', 'en', {
      thankYouSectionLinkUrl: 'https://example.com',
      thankYouSectionLinkText: 'Visit us',
    })
  })

  it('prepends http:// to a thank-you link url missing a protocol', async () => {
    const ctx = buildContext([])

    const patch: Patch = {
      type: 'section',
      action: 'create',
      id: 't1',
      data: {
        _id: 't1',
        code: 'THANKYOU',
        kind: 'thankYou',
        config: { link: { url: { en: 'example.com' } } },
      },
    }

    await handleSectionCreate(patch, ctx)

    expect(upsertFields).toHaveBeenCalledWith(
      'survey-1',
      'project-1',
      'en',
      expect.objectContaining({ thankYouSectionLinkUrl: 'http://example.com' }),
    )
  })
})
