import { Repo, ServerErrorBadRequest } from '@datacapy/server'
import { Patch, schemaManager } from 'veysur-common'

import {
  updateHandler,
  collectL10nFieldUpdate,
  assertUniqueCode,
  assertNoDuplicateCodes,
  assertPatchIdString,
  patchDataRecord,
  type L10nFieldEntry,
} from './PatchContext'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('assertPatchIdString', () => {
  it('returns a non-empty string id unchanged', () => {
    expect(assertPatchIdString('q-1')).toBe('q-1')
  })

  it.each([undefined, '', 42, { _id: 'x' }])('throws a 400 for %p', (id) => {
    expect(() => assertPatchIdString(id as never)).toThrow(
      ServerErrorBadRequest,
    )
  })
})

describe('patchDataRecord', () => {
  it('returns the object payload', () => {
    const data = { code: 'G001' }
    expect(patchDataRecord({ type: 'section', action: 'update', data })).toBe(
      data,
    )
  })

  it.each([null, undefined, [], 'x'])('throws a 400 for %p', (data) => {
    expect(() =>
      patchDataRecord({
        type: 'section',
        action: 'update',
        data: data as never,
      }),
    ).toThrow(ServerErrorBadRequest)
  })
})

describe('updateHandler', () => {
  const buildContext = () => buildPatchContext().ctx

  it('prepends http:// to thankYou.link.url values missing a protocol prefix', async () => {
    const updateOne = jest.fn().mockResolvedValue(undefined)
    const repo = {
      name: 'survey',
      schema: schemaManager.getSchema('survey'),
      initSchema: jest.fn(),
      updateOne,
    } as unknown as Repo<unknown>

    const patch: Patch = {
      type: 'survey',
      action: 'update',
      id: 'survey-1',
      data: {
        thankYou: {
          message: { en: 'Thank you!' },
          link: {
            url: { en: 'example.com' },
            text: { en: 'Continue' },
          },
        },
      },
    }

    await updateHandler(repo, patch, buildContext())

    const [, update] = updateOne.mock.calls[0]
    expect(update.$set.thankYou.link.url.en).toBe('http://example.com')
  })

  it('leaves thankYou.link.url values with a protocol prefix unchanged', async () => {
    const updateOne = jest.fn().mockResolvedValue(undefined)
    const repo = {
      name: 'survey',
      schema: schemaManager.getSchema('survey'),
      initSchema: jest.fn(),
      updateOne,
    } as unknown as Repo<unknown>

    const patch: Patch = {
      type: 'survey',
      action: 'update',
      id: 'survey-1',
      data: {
        thankYou: {
          message: { en: 'Thank you!' },
          link: {
            url: { en: 'https://example.com' },
            text: { en: 'Continue' },
          },
        },
      },
    }

    await updateHandler(repo, patch, buildContext())

    const [, update] = updateOne.mock.calls[0]
    expect(update.$set.thankYou.link.url.en).toBe('https://example.com')
  })
})

describe('assertUniqueCode', () => {
  const buildContext = () => buildPatchContext().ctx

  it('throws when another document already uses the code', async () => {
    const find = jest
      .fn()
      .mockResolvedValue([{ _id: 'q-existing', code: 'Q001' }])
    const repo = { find } as unknown as Repo<unknown>

    await expect(
      assertUniqueCode(repo, buildContext(), 'Question', 'Q001'),
    ).rejects.toThrow(ServerErrorBadRequest)
    expect(find).toHaveBeenCalledWith(
      { surveyId: 'survey-1', code: 'Q001' },
      { context: {} },
    )
  })

  it('does not throw when the only match is the document being updated', async () => {
    const find = jest.fn().mockResolvedValue([{ _id: 'q-1', code: 'Q001' }])
    const repo = { find } as unknown as Repo<unknown>

    await expect(
      assertUniqueCode(repo, buildContext(), 'Question', 'Q001', 'q-1'),
    ).resolves.toBeUndefined()
  })

  it('does not throw when no document uses the code', async () => {
    const find = jest.fn().mockResolvedValue([])
    const repo = { find } as unknown as Repo<unknown>

    await expect(
      assertUniqueCode(repo, buildContext(), 'Question', 'Q001'),
    ).resolves.toBeUndefined()
  })
})

describe('assertNoDuplicateCodes', () => {
  it('throws when two items share the same code', () => {
    expect(() =>
      assertNoDuplicateCodes(
        [{ code: 'A001' }, { code: 'A002' }, { code: 'A001' }],
        'Answer option',
      ),
    ).toThrow(ServerErrorBadRequest)
  })

  it('does not throw when all codes are unique', () => {
    expect(() =>
      assertNoDuplicateCodes(
        [{ code: 'A001' }, { code: 'A002' }],
        'Answer option',
      ),
    ).not.toThrow()
  })

  it('ignores items with no code', () => {
    expect(() =>
      assertNoDuplicateCodes([{}, {}], 'Answer option'),
    ).not.toThrow()
  })
})

describe('collectL10nFieldUpdate', () => {
  it('does nothing when the l10n value is undefined', () => {
    const l10nFields: L10nFieldEntry[] = []
    const clearedFields: string[] = []

    collectL10nFieldUpdate(
      undefined,
      'subquestions.sq1.text',
      l10nFields,
      clearedFields,
    )

    expect(l10nFields).toHaveLength(0)
    expect(clearedFields).toHaveLength(0)
  })

  it('routes a populated l10n object to l10nFields', () => {
    const l10nFields: L10nFieldEntry[] = []
    const clearedFields: string[] = []

    collectL10nFieldUpdate(
      { en: 'Hello', de: 'Hallo' },
      'subquestions.sq1.text',
      l10nFields,
      clearedFields,
    )

    expect(l10nFields).toEqual([
      {
        l10n: { en: 'Hello', de: 'Hallo' },
        fieldPath: 'subquestions.sq1.text',
      },
    ])
    expect(clearedFields).toHaveLength(0)
  })

  it('routes an empty l10n object to clearedFields, so stale per-language values get unset', () => {
    const l10nFields: L10nFieldEntry[] = []
    const clearedFields: string[] = []

    collectL10nFieldUpdate(
      {},
      'answerOptions.ao1.label',
      l10nFields,
      clearedFields,
    )

    expect(l10nFields).toHaveLength(0)
    expect(clearedFields).toEqual(['answerOptions.ao1.label'])
  })
})
