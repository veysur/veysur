import { StatsQueryBuilder } from './StatsQueryBuilder'

describe('StatsQueryBuilder', () => {
  const baseParams = {
    surveyId: 'survey_1',
    snapshotId: 'snapshot_1',
    projectId: 'proj_1',
  }

  const mockRepoParticipant = {
    find: jest.fn().mockResolvedValue([]),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('completed filter alone sets the OR condition directly on the query', async () => {
    const { query } = await StatsQueryBuilder.build(
      { ...baseParams, completed: 'completed' },
      mockRepoParticipant as never,
    )

    expect(query.$or).toEqual([
      { completed: true },
      { completedAt: { $ne: null } },
    ])
    expect(query.$and).toBeUndefined()
  })

  test('search filter alone sets the OR condition directly on the query', async () => {
    const { query } = await StatsQueryBuilder.build(
      { ...baseParams, search: 'jane' },
      mockRepoParticipant as never,
    )

    expect(query.$or).toBeDefined()
    expect(query.$and).toBeUndefined()
  })

  test('completed + search together combine via $and instead of colliding on $or', async () => {
    const { query } = await StatsQueryBuilder.build(
      { ...baseParams, completed: 'completed', search: 'jane' },
      mockRepoParticipant as never,
    )

    expect(query.$or).toBeUndefined()
    const andConditions = query.$and as Record<string, unknown>[]
    expect(andConditions).toHaveLength(2)
    expect(andConditions[0]).toEqual({
      $or: [{ completed: true }, { completedAt: { $ne: null } }],
    })
    expect((andConditions[1] as { $or: unknown }).$or).toBeDefined()
  })

  test('neither completed nor search set — no $or/$and added', async () => {
    const { query } = await StatsQueryBuilder.build(
      baseParams,
      mockRepoParticipant as never,
    )

    expect(query.$or).toBeUndefined()
    expect(query.$and).toBeUndefined()
  })

  test('inProgress filter matches responses with completed:false', async () => {
    const { query } = await StatsQueryBuilder.build(
      { ...baseParams, completed: 'inProgress' },
      mockRepoParticipant as never,
    )

    expect(query.completed).toBe(false)
    expect(query.$or).toBeUndefined()
  })

  test('notStarted filter forces an empty result — no SurveyResponse can match', async () => {
    const { query } = await StatsQueryBuilder.build(
      { ...baseParams, completed: 'notStarted' },
      mockRepoParticipant as never,
    )

    expect(query._id).toEqual({ $exists: false })
    expect(query.$or).toBeUndefined()
    expect(query.$and).toBeUndefined()
  })
})
