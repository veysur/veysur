import { buildDateRangeQuery } from './dateFilterUtils'

describe('buildDateRangeQuery', () => {
  it('returns an empty query when no dates are provided', () => {
    expect(buildDateRangeQuery({})).toEqual({})
  })

  it('builds UTC day boundaries independent of the process timezone', () => {
    const query = buildDateRangeQuery({
      startDate: '2026-08-25',
      endDate: '2026-08-25',
      dateField: 'createdAt',
    })

    expect(query.createdAt.$gte).toEqual(new Date('2026-08-25T00:00:00.000Z'))
    expect(query.createdAt.$lte).toEqual(new Date('2026-08-25T23:59:59.999Z'))
  })

  it('builds an open-ended start boundary', () => {
    const query = buildDateRangeQuery({
      startDate: '2026-08-25',
      dateField: 'updatedAt',
    })

    expect(query.updatedAt.$gte).toEqual(new Date('2026-08-25T00:00:00.000Z'))
    expect(query.updatedAt.$lte).toBeUndefined()
  })

  it('builds an open-ended end boundary', () => {
    const query = buildDateRangeQuery({
      endDate: '2026-08-25',
      dateField: 'updatedAt',
    })

    expect(query.updatedAt.$lte).toEqual(new Date('2026-08-25T23:59:59.999Z'))
    expect(query.updatedAt.$gte).toBeUndefined()
  })

  it('builds day boundaries relative to a non-UTC project timezone', () => {
    const query = buildDateRangeQuery({
      startDate: '2026-08-25',
      endDate: '2026-08-25',
      dateField: 'createdAt',
      timezone: 'America/Los_Angeles',
    })

    // Los Angeles is UTC-7 in August (PDT) - midnight LA is 07:00 UTC
    expect(query.createdAt.$gte).toEqual(new Date('2026-08-25T07:00:00.000Z'))
    expect(query.createdAt.$lte).toEqual(new Date('2026-08-26T06:59:59.999Z'))
  })
})
