jest.useRealTimers()

import { schemaManager } from '../schema-manager'
import {
  SurveyElementCollection,
  SurveyQuestion,
  SurveyContent,
} from '../constructor'

/**
 * Regression: `SchemaSurveyElement` must construct a populated `elements` array
 * through `SurveyElementCollection.fromArray`, which routes each row to
 * `SurveyQuestion` or `SurveyContent` by `kind`. An item-level
 * `.construct('SurveyQuestion')` previously re-wrapped every row — content
 * elements included — into `SurveyQuestion`, dropping `kind: 'content'` and
 * making text-less content elements (e.g. a YouTube video) fail publish
 * validation as "question text required".
 */
describe('SchemaSurveyElement — construct by kind on read', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString()
  const rawRows = [
    {
      _id: 'q1',
      surveyId: 's1',
      createdById: 'u1',
      kind: 'question',
      type: 'text',
      code: 'Q001',
      sectionId: 'g1',
      text: {},
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'c1',
      surveyId: 's1',
      createdById: 'u1',
      kind: 'content',
      type: 'contentVideoYoutube',
      code: 'C001',
      sectionId: 'g1',
      text: {},
      config: { youtube: { url: 'https://youtu.be/dQw4w9WgXcQ' } },
      createdAt: now,
      updatedAt: now,
    },
  ]

  it('builds a SurveyElementCollection discriminated by kind', () => {
    const schema = schemaManager.getSchema('surveyElement')!
    const result = schema.applyTransients(
      rawRows.map((r) => ({ ...r })),
    ) as SurveyElementCollection

    expect(result).toBeInstanceOf(SurveyElementCollection)

    const q = result.getById('q1')!
    const c = result.getById('c1')!

    expect(q).toBeInstanceOf(SurveyQuestion)
    expect(q.kind).toBe('question')

    expect(c).toBeInstanceOf(SurveyContent)
    expect(c.kind).toBe('content')

    expect(result.questions().map((e) => e._id)).toEqual(['q1'])
    expect(result.contents().map((e) => e._id)).toEqual(['c1'])
  })
})
