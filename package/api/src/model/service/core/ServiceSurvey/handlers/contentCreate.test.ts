import { Patch } from 'veysur-common'

import { handleContentCreate } from './contentCreate'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleContentCreate', () => {
  let upsertFields: jest.Mock

  const buildContext = (findResult: unknown[] = []) => {
    const built = buildPatchContext({
      repos: {
        repoSurveyElement: {
          find: jest.fn().mockResolvedValue(findResult),
          insertOne: jest.fn().mockResolvedValue(undefined),
        },
      },
    })
    upsertFields = built.l10n.upsertFields
    return built.ctx
  }

  const patch: Patch = {
    type: 'content',
    action: 'create',
    id: 'c1',
    data: {
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      sectionId: 'g1',
      text: { en: '<p>Intro</p>' },
    },
  }

  it('inserts the content element with kind "content" and strips text', async () => {
    const ctx = buildContext([])

    await expect(handleContentCreate(patch, ctx)).resolves.toBeUndefined()

    const inserted = (ctx.repos.repoSurveyElement.insertOne as jest.Mock).mock
      .calls[0][0]
    expect(inserted).toMatchObject({
      _id: 'c1',
      code: 'C001',
      type: 'contentText',
      sectionId: 'g1',
      kind: 'content',
      surveyId: 'survey-1',
      createdById: 'user-1',
    })
    expect(inserted).not.toHaveProperty('text')
  })

  it('persists the text L10n at elements.<id>.text', async () => {
    const ctx = buildContext([])

    await handleContentCreate(patch, ctx)

    expect(upsertFields).toHaveBeenCalledWith('survey-1', 'project-1', 'en', {
      'elements.c1.text': '<p>Intro</p>',
    })
  })

  it('rejects a code that duplicates an existing element', async () => {
    const ctx = buildContext([{ _id: 'q9', code: 'C001' }])

    await expect(handleContentCreate(patch, ctx)).rejects.toMatchObject({
      code: ['Content element with code "C001" already exists'],
    })
    expect(ctx.repos.repoSurveyElement.insertOne).not.toHaveBeenCalled()
  })
})
