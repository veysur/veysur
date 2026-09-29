import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from '@datacapy/server'
import { TaskLock } from '../constructor'

/**
 * Repository for TaskLock entities
 * Manages distributed locks for task concurrency control
 */
export class RepoTaskLock extends Repo<TaskLock> {
  constructor() {
    super({
      name: 'taskLock',
      autoIndex: false,
      relations: {},
      indexes: {
        lockKey: {
          spec: { lockKey: 1 },
          options: { unique: true },
        },
        expiresAt: {
          spec: { expiresAt: 1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        resourceType: {
          spec: { resourceType: 1, resourceId: 1 },
        },
      },
    })
  }

  /**
   * Try to acquire a lock
   * Creates lock if doesn't exist or is expired
   * Returns false if locked by different execution
   */
  async acquireLock(
    lockKey: string,
    executionId: string,
    ttlSeconds: number = 300,
    resourceType: string = 'general',
    resourceId: string = '',
    note: string | null = null,
  ): Promise<boolean> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

    // Check if lock exists and is not expired
    const existingLock = await this.findOne({ lockKey })

    if (existingLock) {
      // If lock is expired, we can take it over
      if (existingLock.expiresAt <= now) {
        await this.updateOne(
          { lockKey },
          {
            $set: {
              executionId,
              lockedAt: now,
              expiresAt,
              note,
            },
          },
        )
        return true
      }

      // If lock is held by the same execution, extend it
      if (existingLock.executionId === executionId) {
        await this.updateOne(
          { lockKey },
          {
            $set: {
              lockedAt: now,
              expiresAt,
              note,
            },
          },
        )
        return true
      }

      // Lock is held by another execution and not expired
      return false
    }

    // Lock doesn't exist, create it
    try {
      const lockData: Partial<TaskLock> = {
        lockKey,
        resourceType,
        resourceId,
        executionId,
        lockedAt: now,
        expiresAt,
        note,
      }

      const { isValid, errors } = await this.schema.validatePaths(lockData)
      if (!isValid) {
        throw new ServerErrorBadRequest(errors)
      }

      await this.schema.applyFilters(lockData)
      const lock = new TaskLock(lockData)
      await this.insertOne(lock)
      return true
    } catch (error) {
      // If insert fails due to unique constraint, another execution got it first
      if ((error as { code?: number }).code === 11000) {
        return false
      }
      throw error
    }
  }

  /**
   * Release a lock held by an execution
   */
  async releaseLock(lockKey: string, executionId: string): Promise<void> {
    await this.deleteMany({
      lockKey,
      executionId,
    })
  }

  /**
   * Check if a lock exists and is not expired
   */
  async isLocked(lockKey: string): Promise<boolean> {
    const now = new Date()
    const lock = await this.findOne({
      lockKey,
      expiresAt: { $gt: now },
    })
    return !!lock
  }

  /**
   * Extend lock expiration
   */
  async extendLock(
    lockKey: string,
    executionId: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

    await this.updateOne(
      {
        lockKey,
        executionId,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          expiresAt,
        },
      },
    )

    // Check if update was successful by finding the lock
    const lock = await this.findOne({ lockKey, executionId })
    return !!lock
  }

  /**
   * Remove expired locks
   */
  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date()
    await this.deleteMany({
      expiresAt: { $lte: now },
    })
  }
}

export default RepoTaskLock
