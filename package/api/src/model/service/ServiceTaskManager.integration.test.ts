import { ServiceTaskManager } from './ServiceTaskManager'
import { RepoTask } from 'model/repo'
import { DataSourceMysql } from 'mzen-server'
import { asPrivate } from 'test-utils/asPrivate'
import { SchemaTask } from 'veysur-common/model/schema'
import { Task } from 'veysur-common'

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
  withScope: (cb: (scope: { setFingerprint: jest.Mock }) => void) =>
    cb({ setFingerprint: jest.fn() }),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry = require('@sentry/node') as { captureException: jest.Mock }

/**
 * Integration test for the backoff/recovery timing path, run against the real MySQL test
 * datasource (NODE_ENV=test).
 *
 * This exercises `startTasks()` end-to-end through the real `RepoTask.findDueTasks()` query -
 * the same data-layer path affected by the `enabled` index's missing `backedOffUntil` typeHint
 * (see `RepoTask.test.ts`). A task that fails is backed off via `RepoTask.updateBackoff()`; once
 * `backedOffUntil` is in the past (still on the same UTC calendar day - the scenario that
 * exposed the bug), the task must become due again and `startTasks()` must execute it.
 *
 * `RepoTaskExecution` and the executed action service are mocked via the `getRepo`/
 * `modelManager.services` override pattern - only the `task` repo's real MySQL round-trip is
 * relevant to this regression, per the "prefer real RepoTask, mock the rest" guidance.
 */

type ServicePrivateOverrides = {
  getRepo: (name: string) => unknown
  modelManager: {
    services: Record<string, unknown>
    config: Record<string, unknown>
  }
}

describe('ServiceTaskManager backoff/recovery (MySQL integration)', () => {
  let repoTask: RepoTask
  let dataSource: DataSourceMysql
  const testTaskIds: string[] = []

  beforeAll(async () => {
    // The Jest config enables fake timers globally, which stalls mysql2's real network I/O.
    jest.useRealTimers()

    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      // Dedicated, disposable test database - the shared dev `veysurAccount` database carries
      // real seeded scheduler tasks that `findDueTasks()` would also pick up.
      database:
        process.env.MYSQL_DATABASE_TEST || 'veysurServiceTaskManagerTest',
      ensureDatabase: true,
    })
    await dataSource.connect()

    repoTask = new RepoTask()
    repoTask.dataSource = dataSource
    // Wire the real schema directly (ModelManager normally does this via addSchemas()) so
    // `find()`/`findOne()` cast `start`/`backedOffUntil`/etc. back to Date instances -
    // required by `ServiceTaskManager.getCurrentSlot()`.
    repoTask.schema = new SchemaTask()
    repoTask.schema.addConstructors({ Task })

    try {
      await repoTask.drop()
    } catch (error) {
      if (!error.message?.includes("doesn't exist")) {
        throw error
      }
    }
    await repoTask.createIndexes()
  })

  afterEach(async () => {
    if (testTaskIds.length) {
      await repoTask.deleteMany({ _id: { $in: [...testTaskIds] } })
      testTaskIds.length = 0
    }
  })

  afterAll(async () => {
    await dataSource.close()
    jest.useFakeTimers()
  })

  it('backs a failing task off, then executes it again once backedOffUntil has passed', async () => {
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )

    const repoTaskExecution = {
      countAllRunning: jest.fn().mockResolvedValue(0),
      countRunning: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ _id: 'test-exec-1' }),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    }

    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const actionService = {
      run: jest
        .fn()
        .mockRejectedValueOnce(new Error('simulated task failure'))
        .mockResolvedValueOnce(undefined),
    }

    withPrivates.modelManager = {
      services: { testAction: actionService },
      config: {},
    }

    const taskId = `stmT${Date.now().toString(36)}`
    testTaskIds.push(taskId)
    const now = new Date()

    await repoTask.insertOne({
      _id: taskId,
      name: taskId,
      description: '',
      enabled: true,
      start: new Date(now.getTime() - 60_000),
      interval: 30,
      concurrency: 1,
      timeout: 10,
      task: 'testAction',
      action: 'run',
      options: {},
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastRunAt: null,
      lastScheduledAt: null,
      staleSinceAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    })

    // Run 1: the task is due (never scheduled before) - it executes and fails, which backs it
    // off ~5 minutes via RepoTask.updateBackoff().
    await withPrivates.startTasks()

    expect(actionService.run).toHaveBeenCalledTimes(1)

    const afterFailure = await repoTask.findOne({ _id: taskId })
    expect(afterFailure?.consecutiveFailures).toBe(1)
    expect(afterFailure?.enabled).toBe(true)
    expect(afterFailure?.backedOffUntil).not.toBeNull()
    expect(afterFailure!.backedOffUntil!.getTime()).toBeGreaterThan(Date.now())

    // While still backed off, the task must not be picked up again.
    await withPrivates.startTasks()
    expect(actionService.run).toHaveBeenCalledTimes(1)

    // Simulate the backoff period elapsing: backedOffUntil moves into the past, on the same UTC
    // calendar day as now - exactly the comparison the missing typeHint got wrong. Also clear
    // lastScheduledAt so the interval-based due check doesn't gate re-execution on real elapsed
    // time within this fast-running test.
    await repoTask.updateOne(
      { _id: taskId },
      {
        $set: {
          backedOffUntil: new Date(Date.now() - 1000),
          lastScheduledAt: null,
        },
      },
    )

    // Run 2: findDueTasks() must now return the task again (backedOffUntil in the past), and
    // startTasks() must execute it - this time it succeeds and the failure count resets.
    await withPrivates.startTasks()

    expect(actionService.run).toHaveBeenCalledTimes(2)

    const afterRecovery = await repoTask.findOne({ _id: taskId })
    expect(afterRecovery?.consecutiveFailures).toBe(0)
    expect(afterRecovery?.backedOffUntil).toBeNull()
  })

  it('records a failOnErrorCount task that resolves with errors > 0 as a failed execution (soft failure)', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )

    const repoTaskExecution = {
      countAllRunning: jest.fn().mockResolvedValue(0),
      countRunning: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ _id: 'test-exec-soft' }),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    }

    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const actionService = {
      run: jest
        .fn()
        .mockResolvedValue({ bounces: 0, complaints: 0, errors: 2 }),
    }
    withPrivates.modelManager = {
      services: { emailBounceProcessor: actionService },
      config: {},
    }

    const taskId = `stmS${Date.now().toString(36)}`
    testTaskIds.push(taskId)
    const now = new Date()

    await repoTask.insertOne({
      _id: taskId,
      name: taskId,
      description: '',
      enabled: true,
      start: new Date(now.getTime() - 60_000),
      interval: 30,
      concurrency: 1,
      timeout: 10,
      task: 'emailBounceProcessor',
      action: 'run',
      options: {},
      consecutiveFailures: 0,
      failOnErrorCount: true,
      lastFailureAt: null,
      lastRunAt: null,
      lastScheduledAt: null,
      staleSinceAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    })

    await withPrivates.startTasks()

    expect(repoTaskExecution.markFailed).toHaveBeenCalledWith(
      'test-exec-soft',
      expect.stringContaining('2 error(s)'),
      expect.anything(),
    )
    expect(repoTaskExecution.markCompleted).not.toHaveBeenCalled()

    const afterSoftFailure = await repoTask.findOne({ _id: taskId })
    expect(afterSoftFailure?.consecutiveFailures).toBe(1)
    expect(afterSoftFailure?.enabled).toBe(true)
    // A single soft failure must not page — only the second consecutive one does.
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('records a task WITHOUT failOnErrorCount that resolves with errors > 0 as completed', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )

    const repoTaskExecution = {
      countAllRunning: jest.fn().mockResolvedValue(0),
      countRunning: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ _id: 'test-exec-hard' }),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    }

    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const actionService = {
      processDuePayments: jest
        .fn()
        .mockResolvedValue({ processed: 3, failed: 1 }),
    }
    withPrivates.modelManager = {
      services: { paymentScheduler: actionService },
      config: {},
    }

    const taskId = `stmH${Date.now().toString(36)}`
    testTaskIds.push(taskId)
    const now = new Date()

    await repoTask.insertOne({
      _id: taskId,
      name: taskId,
      description: '',
      enabled: true,
      start: new Date(now.getTime() - 60_000),
      interval: 30,
      concurrency: 1,
      timeout: 10,
      task: 'paymentScheduler',
      action: 'processDuePayments',
      options: {},
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastRunAt: null,
      lastScheduledAt: null,
      staleSinceAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    })

    await withPrivates.startTasks()

    expect(repoTaskExecution.markCompleted).toHaveBeenCalled()
    expect(repoTaskExecution.markFailed).not.toHaveBeenCalled()

    const afterRun = await repoTask.findOne({ _id: taskId })
    expect(afterRun?.consecutiveFailures).toBe(0)
  })

  const insertFailingTask = async (
    taskId: string,
    taskName: string,
    consecutiveFailures = 5,
  ): Promise<void> => {
    testTaskIds.push(taskId)
    const now = new Date()
    await repoTask.insertOne({
      _id: taskId,
      name: taskId,
      description: '',
      enabled: true,
      start: new Date(now.getTime() - 60_000),
      interval: 30,
      concurrency: 1,
      timeout: 10,
      task: taskName,
      action: 'run',
      options: {},
      consecutiveFailures,
      lastFailureAt: now,
      lastRunAt: now,
      lastScheduledAt: null,
      staleSinceAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  const runHandleTaskFailure = async (taskId: string): Promise<void> => {
    const service = new ServiceTaskManager()
    asPrivate<ServiceTaskManager, ServicePrivateOverrides>(service).getRepo = ((
      name: string,
    ) => {
      if (name === 'task') return repoTask
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const task = await repoTask.findOne({ _id: taskId })
    await asPrivate<
      ServiceTaskManager,
      { health: { recordFailure: (t: Task) => Promise<void> } }
    >(service).health.recordFailure(task!)
  }

  it('never disables a task after 6 failures — caps any task at 24h and raises task-persistently-failing', async () => {
    jest.clearAllMocks()
    const taskId = `stmM${Date.now().toString(36)}`
    await insertFailingTask(taskId, 'fx')

    await runHandleTaskFailure(taskId)

    const after = await repoTask.findOne({ _id: taskId })
    expect(after?.enabled).toBe(true)
    expect(after?.consecutiveFailures).toBe(6)
    expect(after?.backedOffUntil).not.toBeNull()
    expect(after!.backedOffUntil!.getTime()).toBeGreaterThan(
      Date.now() + 20 * 60 * 60 * 1000,
    )
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('failed 6 times in a row'),
      }),
    )
  })

  it('escalates any task to Sentry on the second consecutive failure', async () => {
    jest.clearAllMocks()
    const taskId = `stmF${Date.now().toString(36)}`
    await insertFailingTask(taskId, 'fx', 1)

    await runHandleTaskFailure(taskId)

    const after = await repoTask.findOne({ _id: taskId })
    expect(after?.consecutiveFailures).toBe(2)
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('failed 2 times in a row'),
      }),
    )
  })

  it('does NOT escalate a task on the first failure', async () => {
    jest.clearAllMocks()
    const taskId = `stmO${Date.now().toString(36)}`
    await insertFailingTask(taskId, 'fx', 0)

    await runHandleTaskFailure(taskId)

    const after = await repoTask.findOne({ _id: taskId })
    expect(after?.consecutiveFailures).toBe(1)
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('confirms a stale task on a second observation before capturing to Sentry', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )
    const repoTaskExecution = {
      findRunning: jest.fn().mockResolvedValue([]),
    }
    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const taskId = `stmL${Date.now().toString(36)}`
    testTaskIds.push(taskId)
    const now = new Date()
    await repoTask.insertOne({
      _id: taskId,
      name: taskId,
      description: '',
      enabled: true,
      start: new Date(now.getTime() - 3_600_000),
      interval: 300,
      concurrency: 1,
      timeout: 10,
      task: 'mailCanary',
      action: 'run',
      options: {},
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastRunAt: new Date(now.getTime() - 3_000_000), // 50 min ago, interval 5 min
      lastScheduledAt: null,
      staleSinceAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    })

    // First observation: record the marker, do not alert.
    await service.monitorRunningTasks()
    expect(Sentry.captureException).not.toHaveBeenCalled()
    const afterFirst = await repoTask.findOne({ _id: taskId })
    expect(afterFirst?.staleSinceAt).not.toBeNull()

    // Still stale one confirmation window later: alert.
    await repoTask.setStaleSinceAt(taskId, new Date(now.getTime() - 600_000))
    await service.monitorRunningTasks()
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('has not run for'),
      }),
    )

    // Task runs again → marker cleared.
    await repoTask.setLastRunAt(taskId, new Date(), new Date())
    const afterRun = await repoTask.findOne({ _id: taskId })
    expect(afterRun?.staleSinceAt).toBeNull()
  })

  const makeExecutionRepo = () => {
    let seq = 0
    return {
      countAllRunning: jest.fn().mockResolvedValue(0),
      countRunning: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async () => ({
        _id: `test-exec-${++seq}`,
      })),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    }
  }

  const insertDrainTask = async (
    taskId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<void> => {
    testTaskIds.push(taskId)
    const now = new Date()
    await repoTask.insertOne({
      _id: taskId,
      name: taskId,
      description: '',
      enabled: true,
      start: new Date(now.getTime() - 3_600_000),
      interval: 60,
      concurrency: 1,
      timeout: 10,
      task: 'drainAction',
      action: 'run',
      options: { tag: taskId },
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastRunAt: new Date(now.getTime() - 120_000),
      lastScheduledAt: null,
      staleSinceAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
  }

  it('drains every due task in a single run rather than just the first', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )
    const repoTaskExecution = makeExecutionRepo()
    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const run = jest.fn().mockResolvedValue(undefined)
    withPrivates.modelManager = {
      services: { drainAction: { run } },
      config: {},
    }

    const prefix = `dr${Date.now().toString(36)}`
    await insertDrainTask(`${prefix}a`)
    await insertDrainTask(`${prefix}b`)
    await insertDrainTask(`${prefix}c`)

    await withPrivates.startTasks()

    expect(run).toHaveBeenCalledTimes(3)
  })

  it('runs the most-starved task first while still executing the rest', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )
    const repoTaskExecution = makeExecutionRepo()
    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const order: string[] = []
    const run = jest.fn().mockImplementation(async (opts: { tag: string }) => {
      order.push(opts.tag)
    })
    withPrivates.modelManager = {
      services: { drainAction: { run } },
      config: {},
    }

    const now = Date.now()
    const prefix = `or${now.toString(36)}`
    // A 60s task starved for ~13 intervals (the mail-queue failure mode).
    await insertDrainTask(`${prefix}s`, {
      interval: 60,
      lastRunAt: new Date(now - 800_000),
    })
    // An hourly task just past its slot (on cadence — lateness ~1).
    await insertDrainTask(`${prefix}h`, {
      interval: 3600,
      lastRunAt: new Date(now - 3_600_000),
    })

    await withPrivates.startTasks()

    expect(order).toEqual([`${prefix}s`, `${prefix}h`])
  })

  it('stops after the per-run task budget (maxConcurrency) is reached', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )
    const repoTaskExecution = makeExecutionRepo()
    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const run = jest.fn().mockResolvedValue(undefined)
    withPrivates.modelManager = {
      services: { drainAction: { run } },
      config: { taskManager: { maxConcurrency: 2 } },
    }

    const prefix = `bg${Date.now().toString(36)}`
    await insertDrainTask(`${prefix}a`)
    await insertDrainTask(`${prefix}b`)
    await insertDrainTask(`${prefix}c`)
    await insertDrainTask(`${prefix}d`)

    await withPrivates.startTasks()

    expect(run).toHaveBeenCalledTimes(2)
  })

  it('one failing task does not abort the drain of the rest', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )
    const repoTaskExecution = makeExecutionRepo()
    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const run = jest.fn().mockImplementation(async (opts: { tag: string }) => {
      if (opts.tag.endsWith('2')) throw new Error('simulated failure')
    })
    withPrivates.modelManager = {
      services: { drainAction: { run } },
      config: {},
    }

    const now = Date.now()
    const prefix = `rs${now.toString(36)}`
    // Middle task (by lateness order) throws; the other two must still run.
    await insertDrainTask(`${prefix}1`, {
      lastRunAt: new Date(now - 600_000),
    })
    await insertDrainTask(`${prefix}2`, {
      lastRunAt: new Date(now - 400_000),
    })
    await insertDrainTask(`${prefix}3`, {
      lastRunAt: new Date(now - 200_000),
    })

    await withPrivates.startTasks()

    expect(run).toHaveBeenCalledTimes(3)
    expect(repoTaskExecution.markFailed).toHaveBeenCalledTimes(1)
  })

  it('drains the 60s mail queue in the same run as an hour-boundary task batch', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )
    const repoTaskExecution = makeExecutionRepo()
    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution') return repoTaskExecution
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const ran: string[] = []
    const run = jest.fn().mockImplementation(async (opts: { tag: string }) => {
      ran.push(opts.tag)
    })
    withPrivates.modelManager = {
      services: { drainAction: { run } },
      config: {},
    }

    const now = Date.now()
    const prefix = `hr${now.toString(36)}`
    // Three hourly tasks all just came due, seeded before the mail queue.
    for (let i = 0; i < 3; i++) {
      await insertDrainTask(`${prefix}h${i}`, {
        interval: 3600,
        lastRunAt: new Date(now - 3_600_000),
      })
    }
    // Mail queue seeded last, as in the real DB. Under the old one-task-per-tick
    // rule it would be starved behind the batch every hour; the drain runs it in
    // the same tick.
    await insertDrainTask(`${prefix}z`, {
      interval: 60,
      lastRunAt: new Date(now - 60_000),
    })

    await withPrivates.startTasks()

    expect(ran).toContain(`${prefix}z`)
    expect(ran).toHaveLength(4)
  })

  it('does NOT flag a sub-minute-interval task stale within the 10-minute floor', async () => {
    jest.clearAllMocks()
    const service = new ServiceTaskManager()
    const withPrivates = asPrivate<ServiceTaskManager, ServicePrivateOverrides>(
      service,
    )
    withPrivates.getRepo = ((name: string) => {
      if (name === 'task') return repoTask
      if (name === 'taskExecution')
        return { findRunning: jest.fn().mockResolvedValue([]) }
      throw new Error(`Unexpected repo requested in test: ${name}`)
    }) as unknown as ServicePrivateOverrides['getRepo']

    const taskId = `stmDeploy${Date.now().toString(36)}`
    testTaskIds.push(taskId)
    const now = new Date()
    await repoTask.insertOne({
      _id: taskId,
      name: taskId,
      description: '',
      enabled: true,
      start: new Date(now.getTime() - 3_600_000),
      interval: 60,
      concurrency: 1,
      timeout: 5,
      task: 'email',
      action: 'processQueue',
      options: {},
      consecutiveFailures: 0,
      lastFailureAt: null,
      // 5 min ago — well past 2× interval, but inside the 10-minute deploy-gap floor
      lastRunAt: new Date(now.getTime() - 300_000),
      lastScheduledAt: null,
      staleSinceAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    })

    await service.monitorRunningTasks()

    expect(Sentry.captureException).not.toHaveBeenCalled()
    const after = await repoTask.findOne({ _id: taskId })
    expect(after?.staleSinceAt).toBeNull()
  })
})
