import { Patch } from 'veysur-common'

import { handleContentUpdate } from './contentUpdate'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleContentUpdate', () => {
  let upsertFields: jest.Mock
  let updateOne: jest.Mock

  const buildContext = (findResult: unknown[] = []) => {
    updateOne = jest.fn().mockResolvedValue(undefined)
    const built = buildPatchContext({
      repos: {
        repoSurveyElement: {
          find: jest.fn().mockResolvedValue(findResult),
          updateOne,
        },
      },
    })
    upsertFields = built.l10n.upsertFields
    return built.ctx
  }

  it('writes structural fields without text', async () => {
    const ctx = buildContext()
    const patch: Patch = {
      type: 'content',
      action: 'update',
      id: 'c1',
      data: { config: { youtube: { url: 'x' } } },
    }

    await handleContentUpdate(patch, ctx)

    expect(updateOne).toHaveBeenCalledTimes(1)
    const setArg = updateOne.mock.calls[0][1].$set
    expect(setArg).toMatchObject({ config: { youtube: { url: 'x' } } })
    expect(setArg).not.toHaveProperty('text')
    expect(upsertFields).not.toHaveBeenCalled()
  })

  it('persists text-only patches without touching the row', async () => {
    const ctx = buildContext()
    const patch: Patch = {
      type: 'content',
      action: 'update',
      id: 'c1',
      data: { text: { en: 'A' } },
    }

    await handleContentUpdate(patch, ctx)

    expect(updateOne).not.toHaveBeenCalled()
    expect(upsertFields).toHaveBeenCalledWith('survey-1', 'project-1', 'en', {
      'elements.c1.text': 'A',
    })
  })

  it('rejects a code that duplicates a sibling element', async () => {
    const ctx = buildContext([{ _id: 'c2', code: 'C002' }])
    const patch: Patch = {
      type: 'content',
      action: 'update',
      id: 'c1',
      data: { code: 'C002' },
    }

    await expect(handleContentUpdate(patch, ctx)).rejects.toMatchObject({
      code: ['Content element with code "C002" already exists'],
    })
    expect(updateOne).not.toHaveBeenCalled()
  })
})
