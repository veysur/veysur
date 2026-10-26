import { Notification } from 'veysur-common'
import { Repo, relb, repib } from '@datacapy/server'

/**
 * Default (account) datasource, not project-scoped - same reasoning as
 * RepoDataTransferJob: a personal notification tray needs to be found
 * across a user's activity, not queried one project's datasource at a time.
 * Each row's own `projectId` scopes it, same convention as DataTransferJob.
 */
export class RepoNotification extends Repo<Notification> {
  constructor() {
    super({
      name: 'notification',
      autoIndex: false,
      relations: {
        dataTransferJob: relb
          .belongsToOne('dataTransferJob')
          .key('dataTransferJobId')
          .autoPopulate(false)
          .recursion(0),
      },
      indexes: {
        // Backs findByRecipient() - list()'s personal-notification query.
        recipient: repib
          .asc('projectId')
          .asc('recipientUserId')
          .desc('createdAt')
          .timestamp('createdAt'),
        // Backs findSettledOlderThan()'s cleanup query - retention is
        // measured from when a notification was read/dismissed, not from
        // when its job was originally enqueued (createdAt).
        settled: repib
          .asc('status')
          .asc('dismissedAt')
          .asc('readAt')
          .timestamp('dismissedAt')
          .timestamp('readAt'),
      },
    })
  }

  async findByRecipient({
    projectId,
    recipientUserId,
    limit,
    offset,
  }: {
    projectId: string
    recipientUserId: string
    limit: number
    offset: number
  }): Promise<Notification[]> {
    return this.find(
      { projectId, recipientUserId, status: { $ne: 'dismissed' } },
      {
        sort: { createdAt: -1 },
        limit,
        offset,
        populate: { dataTransferJob: true },
      },
    )
  }

  async findSettledOlderThan(cutoffDate: Date): Promise<Notification[]> {
    return this.find(
      {
        $or: [
          { status: 'dismissed', dismissedAt: { $lte: cutoffDate } },
          { status: 'read', readAt: { $lte: cutoffDate } },
        ],
      },
      { limit: 500 },
    )
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0
    const result = await this.deleteMany({ _id: { $in: ids } })
    return result?.count ?? 0
  }
}

export default RepoNotification
