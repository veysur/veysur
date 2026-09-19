import { Patch } from 'veysur-common'

import { handleSectionUpdate } from './sectionUpdate'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleSectionUpdate', () => {
  let upsertFields: jest.Mock
  let removeEntityFields: jest.Mock

  const buildContext = (findResult: unknown[] = []) => {
    const built = buildPatchContext({
      repos: {
        repoSurveySection: {
          find: jest.fn().mockResolvedValue(findResult),
          updateOne: jest.fn().mockResolvedValue(undefined),
        },
      },
    })
    upsertFields = built.l10n.upsertFields
    removeEntityFields = built.l10n.removeEntityFields
    return built.ctx
  }

  it('updates a group when the new code is unique', async () => {
    const ctx = buildContext([{ _id: 'group-1', code: 'G001' }])

    const patch: Patch = {
      type: 'section',
      action: 'update',
      id: 'group-1',
      data: { code: 'G001' },
    }

    await expect(handleSectionUpdate(patch, ctx)).resolves.toBeUndefined()
    expect(ctx.repos.repoSurveySection.updateOne).toHaveBeenCalled()
  })

  it('rejects a group code that duplicates a sibling group', async () => {
    const ctx = buildContext([{ _id: 'group-2', code: 'G001' }])

    const patch: Patch = {
      type: 'section',
      action: 'update',
      id: 'group-1',
      data: { code: 'G001' },
    }

    await expect(handleSectionUpdate(patch, ctx)).rejects.toMatchObject({
      code: ['Group with code "G001" already exists'],
    })
    expect(ctx.repos.repoSurveySection.updateOne).not.toHaveBeenCalled()
  })

  it('routes a welcome section desc edit to welcomeSectionDesc, no row update', async () => {
    const ctx = buildContext([{ _id: 'w1', code: 'WELCOME', kind: 'welcome' }])

    const patch: Patch = {
      type: 'section',
      action: 'update',
      id: 'w1',
      data: { desc: { en: '<p>Hello</p>' } },
    }

    await handleSectionUpdate(patch, ctx)

    expect(upsertFields).toHaveBeenCalledWith('survey-1', 'project-1', 'en', {
      welcomeSectionDesc: '<p>Hello</p>',
    })
    expect(ctx.repos.repoSurveySection.updateOne).not.toHaveBeenCalled()
  })

  it('clears welcomeSectionDesc when desc is null', async () => {
    const ctx = buildContext([{ _id: 'w1', code: 'WELCOME', kind: 'welcome' }])

    const patch: Patch = {
      type: 'section',
      action: 'update',
      id: 'w1',
      data: { desc: null },
    }

    await handleSectionUpdate(patch, ctx)

    expect(removeEntityFields).toHaveBeenCalledWith('survey-1', 'project-1', [
      'welcomeSectionDesc',
    ])
  })
})
