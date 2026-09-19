import { buildMultiFieldSearchQuery } from './searchQueryUtils'

describe('buildMultiFieldSearchQuery', () => {
  it('builds a single $or clause for a single-word search', () => {
    const query = buildMultiFieldSearchQuery('John', ['nameFirst', 'nameLast'])

    expect(query).toEqual({
      $and: [
        {
          $or: [
            { nameFirst: { $regex: 'John', $options: 'i' } },
            { nameLast: { $regex: 'John', $options: 'i' } },
          ],
        },
      ],
    })
  })

  it('requires every token to match at least one field for multi-word search', () => {
    const query = buildMultiFieldSearchQuery('John Smith', [
      'nameFirst',
      'nameLast',
    ])

    expect(query).toEqual({
      $and: [
        {
          $or: [
            { nameFirst: { $regex: 'John', $options: 'i' } },
            { nameLast: { $regex: 'John', $options: 'i' } },
          ],
        },
        {
          $or: [
            { nameFirst: { $regex: 'Smith', $options: 'i' } },
            { nameLast: { $regex: 'Smith', $options: 'i' } },
          ],
        },
      ],
    })
  })

  it('collapses repeated whitespace and ignores leading/trailing spaces', () => {
    const query = buildMultiFieldSearchQuery('  John   Smith  ', ['email'])

    expect(query.$and).toHaveLength(2)
  })

  it('escapes regex special characters in each token', () => {
    const query = buildMultiFieldSearchQuery('a.b (c)', ['email']) as {
      $and: Array<{ $or: Array<{ email: { $regex: string } }> }>
    }

    expect(query.$and[0].$or[0].email.$regex).toBe('a\\.b')
    expect(query.$and[1].$or[0].email.$regex).toBe('\\(c\\)')
  })
})
