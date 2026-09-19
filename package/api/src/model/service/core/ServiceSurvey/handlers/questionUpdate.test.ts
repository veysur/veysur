import { Patch } from 'veysur-common'

import { handleQuestionUpdate } from './questionUpdate'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleQuestionUpdate', () => {
  const buildContext = (
    l10nMocks: {
      upsertFields?: jest.Mock
      removeEntityFields?: jest.Mock
      upsertAnswerOptionImage?: jest.Mock
    },
    findOneResult: unknown = null,
  ) =>
    buildPatchContext({
      l10n: l10nMocks as Record<string, jest.Mock>,
      repos: {
        repoSurveyElement: {
          findOne: jest.fn().mockResolvedValue(findOneResult),
          updateOne: jest.fn().mockResolvedValue(undefined),
        },
      },
    }).ctx

  it('persists changed subquestion text through the survey-language store', async () => {
    const upsertFields = jest.fn().mockResolvedValue(undefined)
    const ctx = buildContext({ upsertFields })

    const patch: Patch = {
      type: 'element',
      action: 'update',
      id: 'question-1',
      data: {
        subquestions: [{ _id: 'sq1', text: { en: 'New Text' } }],
      },
    }

    await handleQuestionUpdate(patch, ctx)

    expect(upsertFields).toHaveBeenCalledWith('survey-1', 'project-1', 'en', {
      'subquestions.sq1.text': 'New Text',
    })
  })

  it('clears stale subquestion text when a subquestion is swapped to an empty label', async () => {
    const upsertFields = jest.fn().mockResolvedValue(undefined)
    const removeEntityFields = jest.fn().mockResolvedValue(undefined)
    const ctx = buildContext({ upsertFields, removeEntityFields })

    const patch: Patch = {
      type: 'element',
      action: 'update',
      id: 'question-1',
      data: {
        subquestions: [{ _id: 'sq1', text: {} }],
      },
    }

    await handleQuestionUpdate(patch, ctx)

    expect(removeEntityFields).toHaveBeenCalledWith('survey-1', 'project-1', [
      'subquestions.sq1.text',
    ])
    expect(upsertFields).not.toHaveBeenCalled()
  })

  it('still persists changed answer option labels through the survey-language store', async () => {
    const upsertFields = jest.fn().mockResolvedValue(undefined)
    const ctx = buildContext(
      { upsertFields },
      {
        _id: 'question-1',
        answerOptions: [{ _id: 'ao1', label: { en: 'Old' } }],
      },
    )

    const patch: Patch = {
      type: 'element',
      action: 'update',
      id: 'question-1',
      data: {
        answerOptions: [{ _id: 'ao1', label: { en: 'New Label' } }],
      },
    }

    await handleQuestionUpdate(patch, ctx)

    expect(upsertFields).toHaveBeenCalledWith('survey-1', 'project-1', 'en', {
      'answerOptions.ao1.label': 'New Label',
    })
  })

  it('clears stale answer option label when an answer option is swapped to an empty label', async () => {
    const upsertFields = jest.fn().mockResolvedValue(undefined)
    const removeEntityFields = jest.fn().mockResolvedValue(undefined)
    const ctx = buildContext(
      { upsertFields, removeEntityFields },
      {
        _id: 'question-1',
        answerOptions: [{ _id: 'ao1', label: { en: 'Old' } }],
      },
    )

    const patch: Patch = {
      type: 'element',
      action: 'update',
      id: 'question-1',
      data: {
        answerOptions: [{ _id: 'ao1', label: {} }],
      },
    }

    await handleQuestionUpdate(patch, ctx)

    expect(removeEntityFields).toHaveBeenCalledWith('survey-1', 'project-1', [
      'answerOptions.ao1.label',
    ])
    expect(upsertFields).not.toHaveBeenCalled()
  })

  it('rejects a subquestions array with duplicate codes', async () => {
    const ctx = buildContext({})

    const patch: Patch = {
      type: 'element',
      action: 'update',
      id: 'question-1',
      data: {
        subquestions: [
          { _id: 'sq1', code: 'S001', text: { en: 'Row 1' } },
          { _id: 'sq2', code: 'S001', text: { en: 'Row 2' } },
        ],
      },
    }

    await expect(handleQuestionUpdate(patch, ctx)).rejects.toMatchObject({
      code: ['Subquestion with code "S001" already exists'],
    })
  })

  it('rejects an answerOptions array with duplicate codes', async () => {
    const ctx = buildContext(
      {},
      {
        _id: 'question-1',
        answerOptions: [],
      },
    )

    const patch: Patch = {
      type: 'element',
      action: 'update',
      id: 'question-1',
      data: {
        answerOptions: [
          { _id: 'ao1', code: 'A001', label: { en: 'Option A' } },
          { _id: 'ao2', code: 'A001', label: { en: 'Option B' } },
        ],
      },
    }

    await expect(handleQuestionUpdate(patch, ctx)).rejects.toMatchObject({
      code: ['Answer option with code "A001" already exists'],
    })
  })

  it('rejects a question code that duplicates a sibling question', async () => {
    const ctx = buildContext({})
    ctx.repos.repoSurveyElement.find = jest
      .fn()
      .mockResolvedValue([{ _id: 'question-2', code: 'Q001' }])

    const patch: Patch = {
      type: 'element',
      action: 'update',
      id: 'question-1',
      data: {
        code: 'Q001',
      },
    }

    await expect(handleQuestionUpdate(patch, ctx)).rejects.toMatchObject({
      code: ['Question with code "Q001" already exists'],
    })
  })
})
