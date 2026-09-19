import { Patch } from 'veysur-common'

import { handleQuestionCreate } from './questionCreate'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleQuestionCreate', () => {
  const buildContext = (findResult: unknown[] = []) =>
    buildPatchContext({
      repos: {
        repoSurveyElement: {
          find: jest.fn().mockResolvedValue(findResult),
          insertOne: jest.fn().mockResolvedValue(undefined),
        },
      },
    }).ctx

  it('creates a question when the code is unique', async () => {
    const ctx = buildContext([])

    const patch: Patch = {
      type: 'element',
      action: 'create',
      id: 'question-1',
      data: { _id: 'question-1', code: 'Q001', text: { en: 'Question 1' } },
    }

    await expect(handleQuestionCreate(patch, ctx)).resolves.toBeUndefined()
    expect(ctx.repos.repoSurveyElement.insertOne).toHaveBeenCalled()
  })

  it('rejects a question code that duplicates an existing question', async () => {
    const ctx = buildContext([{ _id: 'question-2', code: 'Q001' }])

    const patch: Patch = {
      type: 'element',
      action: 'create',
      id: 'question-1',
      data: { _id: 'question-1', code: 'Q001', text: { en: 'Question 1' } },
    }

    await expect(handleQuestionCreate(patch, ctx)).rejects.toMatchObject({
      code: ['Question with code "Q001" already exists'],
    })
    expect(ctx.repos.repoSurveyElement.insertOne).not.toHaveBeenCalled()
  })

  it('rejects an answerOptions array with duplicate codes', async () => {
    const ctx = buildContext([])

    const patch: Patch = {
      type: 'element',
      action: 'create',
      id: 'question-1',
      data: {
        _id: 'question-1',
        code: 'Q001',
        text: { en: 'Question 1' },
        answerOptions: [
          { _id: 'ao1', code: 'A001', label: { en: 'Option A' } },
          { _id: 'ao2', code: 'A001', label: { en: 'Option B' } },
        ],
      },
    }

    await expect(handleQuestionCreate(patch, ctx)).rejects.toMatchObject({
      code: ['Answer option with code "A001" already exists'],
    })
    expect(ctx.repos.repoSurveyElement.insertOne).not.toHaveBeenCalled()
  })
})
