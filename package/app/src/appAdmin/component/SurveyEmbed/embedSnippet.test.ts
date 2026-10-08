import { Survey } from 'veysur-common'

import {
  buildEmbedPreviewUrl,
  buildEmbedSnippet,
  getEmbedBlockers,
} from './embedSnippet'

const target = {
  origin: 'https://acme.veysur.com',
  projectId: 'p1',
  surveyId: 's1',
}

const makeSurvey = (types: string[]) =>
  new Survey({
    _id: 's1',
    name: 'Test',
    createdById: 'u1',
    title: {},
    attributes: {},
    sections: [{ _id: 'g1', kind: 'group', code: 'G001' }],
    sectionIds: ['g1'],
    elements: types.map((type, i) => ({
      _id: `q${i}`,
      kind: 'question' as const,
      code: `Q00${i}`,
      type,
      sectionId: 'g1',
      text: {},
    })),
    elementIds: types.map((_, i) => `q${i}`),
  })

describe('embedSnippet', () => {
  test('builds the script tag the loader reads', () => {
    expect(buildEmbedSnippet(target)).toBe(
      '<script async src="https://acme.veysur.com/embed/loader.js" data-survey="p1/s1"></script>',
    )
  })

  test('adds the language only when one is given', () => {
    expect(buildEmbedSnippet({ ...target, language: 'de' })).toContain(
      ' data-lang="de"',
    )
    expect(buildEmbedPreviewUrl({ ...target, language: 'de' })).toBe(
      'https://acme.veysur.com/embed/p1/s1?lang=de',
    )
    expect(buildEmbedPreviewUrl(target)).toBe(
      'https://acme.veysur.com/embed/p1/s1',
    )
  })
})

describe('getEmbedBlockers', () => {
  const ok = { open: true, publicReg: false }

  test('has no blockers for an open survey without registration or uploads', () => {
    expect(getEmbedBlockers(ok, makeSurvey(['text']))).toEqual([])
  })

  test('reports every reason that applies', () => {
    expect(
      getEmbedBlockers(
        { open: false, publicReg: true },
        makeSurvey(['fileUpload']),
      ),
    ).toEqual(['notOpen', 'registration', 'fileUpload'])
  })
})
