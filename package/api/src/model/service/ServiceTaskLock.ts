import { Service } from 'mzen-server'
import { RepoTaskLock } from '../repo'

/**
 * Service for TaskLock management
 * Provides high-level locking utilities for task concurrency control
 */
export class ServiceTaskLock extends Service {
  constructor() {
    super({
      name: 'taskLock',
    })
  }

  /**
   * Execute a callback with a lock held
   * Ensures lock is always released even on error
   */
  async withLock<T>(
    lockKey: string,
    executionId: string,
    ttlSeconds: number,
    callback: () => Promise<T>,
    resourceType: string = 'general',
    resourceId: string = '',
    note: string | null = null,
  ): Promise<T> {
    const repoTaskLock = this.getRepo<RepoTaskLock>('taskLock')

    // Acquire lock
    const acquired = await repoTaskLock.acquireLock(
      lockKey,
      executionId,
      ttlSeconds,
      resourceType,
      resourceId,
      note,
    )

    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${lockKey}`)
    }

    try {
      // Execute callback with lock held
      return await callback()
    } finally {
      // Always release lock, even on error
      await repoTaskLock.releaseLock(lockKey, executionId)
    }
  }

  /**
   * Cleanup expired locks
   * Called by task manager during cleanup phase
   */
  async cleanupExpired(): Promise<void> {
    const repoTaskLock = this.getRepo<RepoTaskLock>('taskLock')
    await repoTaskLock.cleanupExpiredLocks()
  }
}
