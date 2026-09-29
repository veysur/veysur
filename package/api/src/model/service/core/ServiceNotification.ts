import { Service, ServerErrorNotFound } from '@datacapy/server'
import { Notification, DataTransferJob } from 'veysur-common'
import momentTimezone from 'moment-timezone'

import { RepoNotification, RepoFile } from 'model'
import { AclContext } from 'model/entity/AclContext'
import { resolveDataTransferFileDownload } from 'model/common'
import { parsePaginationParams } from 'common'

import { ServiceDataTransferJob } from './ServiceDataTransferJob'
import { StorageConfig, getStorageConfig } from './ServiceFile/FileS3Config'

/**
 * Persists notifications related to (not replacing) the entity that
 * produced them - see Notification's own doc comment. DataTransferJob is
 * the only producer today: ServiceDataTransferJob calls create() when a job
 * is enqueued and updateForDataTransferJob() when it completes/fails,
 * instead of the frontend inferring a notification from polling the job's
 * own status.
 *
 * cleanupOld() also owns deleting the related DataTransferJob row: once a
 * job's notification has been read/dismissed and aged out, the job row has
 * no remaining purpose - this replaces DataTransferJob's own former
 * cleanupOld()/seeded task.
 */
export class ServiceNotification extends Service {
  constructor() {
    super({ name: 'notification' })
  }

  private getRepoNotification(): RepoNotification {
    return this.getRepo<RepoNotification>('notification')
  }

  private getStorageConfig(): StorageConfig {
    return getStorageConfig(this.config)
  }

  async create({
    type,
    projectId,
    recipientUserId,
    dataTransferJobId,
    level,
    title,
    message,
  }: {
    type: Notification['type']
    projectId: string
    recipientUserId: string
    dataTransferJobId?: string | null
    level: Notification['level']
    title: string
    message?: string | null
  }): Promise<Notification> {
    const notification = new Notification({
      type,
      projectId,
      recipientUserId,
      dataTransferJobId: dataTransferJobId ?? null,
      level,
      title,
      message: message ?? null,
      status: 'unread',
    })
    await this.getRepoNotification().insertOne(notification)
    return notification
  }

  /**
   * Update the notification related to a DataTransferJob as its underlying
   * job progresses (e.g. queued -> completed/failed). Resets status back to
   * 'unread' (and clears readAt/dismissedAt) so a settling job re-surfaces
   * even if the user had already read/dismissed its earlier 'info' state -
   * this is the event useNotifications() toasts on.
   */
  async updateForDataTransferJob({
    dataTransferJobId,
    level,
    title,
    message,
  }: {
    dataTransferJobId: string
    level: Notification['level']
    title: string
    message?: string | null
  }): Promise<void> {
    await this.getRepoNotification().updateOne(
      { dataTransferJobId },
      {
        $set: {
          level,
          title,
          message: message ?? null,
          status: 'unread',
          readAt: null,
          dismissedAt: null,
        },
      },
    )
  }

  /**
   * Shared by list(): resolve a completed export's download URL server-side
   * so the frontend gets a ready-to-use downloadUrl in the same round trip
   * as the notification list, rather than a second call to
   * data-transfer-job/status/:jobId. See resolveDataTransferFileDownload()
   * (model/common) for the shared logic with
   * ServiceDataTransferJob.resolveCompletedFile() - including the
   * requestHost/requestProto override, which this now applies too.
   */
  private async resolveDownload({
    dataTransferJob,
    projectId,
  }: {
    dataTransferJob: DataTransferJob | null
    projectId: string
  }): Promise<{ downloadUrl?: string; filename?: string; expiresAt?: Date }> {
    if (!dataTransferJob) {
      return {}
    }

    const { downloadUrl, filename, expiresAt } =
      await resolveDataTransferFileDownload(
        {
          status: dataTransferJob.status,
          resultFileId: dataTransferJob.resultFileId,
          projectId,
          requestHost: dataTransferJob.requestHost,
          requestProto: dataTransferJob.requestProto,
        },
        {
          repoFile: this.getRepo<RepoFile>('file'),
          storageConfig: this.getStorageConfig(),
        },
      )
    return { downloadUrl, filename, expiresAt }
  }

  /**
   * List the calling admin's own notifications, most recent first - the
   * data source for the notification bell/panel. Scoped to
   * `aclContext.jwt._id`, same as DataTransferJob.listJobs() used to be: a
   * personal notification tray, not a project-wide activity log.
   */
  async list({
    projectId,
    aclContext,
    page,
    perPage,
  }: {
    projectId: string
    aclContext: AclContext
    page?: number
    perPage?: number
  }): Promise<{
    notifications: Array<{
      notificationId: string
      type: Notification['type']
      level: Notification['level']
      title: string
      message: string | null
      status: Notification['status']
      dataTransferJobId: string | null
      dataTransferJobStatus?: DataTransferJob['status']
      dataTransferJobError?: string | null
      downloadUrl?: string
      filename?: string
      expiresAt?: Date
      createdAt: Date
    }>
    notificationCount: number
  }> {
    const userId = aclContext.jwt?._id ?? ''
    const pagination = parsePaginationParams(page, perPage, { perPage: 20 })
    const offset = (pagination.page - 1) * pagination.perPage

    const repo = this.getRepoNotification()
    const query = {
      projectId,
      recipientUserId: userId,
      status: { $ne: 'dismissed' },
    }
    const [notificationCount, notifications] = await Promise.all([
      repo.count(query),
      repo.findByRecipient({
        projectId,
        recipientUserId: userId,
        limit: pagination.perPage,
        offset,
      }),
    ])

    const resolvedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const resolved = await this.resolveDownload({
          dataTransferJob: notification.dataTransferJob,
          projectId,
        })
        return {
          notificationId: notification._id,
          type: notification.type,
          level: notification.level,
          title: notification.title,
          message: notification.message,
          status: notification.status,
          dataTransferJobId: notification.dataTransferJobId,
          ...(notification.dataTransferJob
            ? {
                dataTransferJobStatus: notification.dataTransferJob.status,
                dataTransferJobError: notification.dataTransferJob.error,
              }
            : notification.dataTransferJobId
              ? {
                  // dataTransferJobId is only ever set once the job row was
                  // actually inserted (see enqueueImport/enqueueExport), so
                  // a populate miss here means the row is definitively gone
                  // - surface it as failed rather than leaving the
                  // notification stuck at "Queued" forever with no way to
                  // dismiss it (isSettled() only allows completed/failed).
                  dataTransferJobStatus: 'failed' as const,
                  dataTransferJobError: 'This job is no longer available.',
                }
              : {}),
          ...(resolved.downloadUrl
            ? {
                downloadUrl: resolved.downloadUrl,
                filename: resolved.filename,
                expiresAt: resolved.expiresAt,
              }
            : {}),
          createdAt: notification.createdAt,
        }
      }),
    )

    return { notifications: resolvedNotifications, notificationCount }
  }

  private async findOwned({
    notificationId,
    projectId,
    aclContext,
  }: {
    notificationId: string
    projectId: string
    aclContext: AclContext
  }): Promise<Notification> {
    const repo = this.getRepoNotification()
    const userId = aclContext.jwt?._id ?? ''
    const notification = await repo.findOne({ _id: notificationId })
    if (
      !notification ||
      notification.projectId !== projectId ||
      notification.recipientUserId !== userId
    ) {
      throw new ServerErrorNotFound({
        message: 'Notification not found',
        notificationId,
      })
    }
    return notification
  }

  async markRead({
    notificationId,
    projectId,
    aclContext,
  }: {
    notificationId: string
    projectId: string
    aclContext: AclContext
  }): Promise<{ success: true }> {
    const notification = await this.findOwned({
      notificationId,
      projectId,
      aclContext,
    })
    if (notification.status === 'unread') {
      await this.getRepoNotification().updateOne(
        { _id: notification._id },
        { $set: { status: 'read', readAt: new Date() } },
      )
    }
    return { success: true }
  }

  /**
   * Marks a notification dismissed - the notification panel's manual
   * dismiss action. Never touches the related DataTransferJob row; that
   * row's lifecycle is owned entirely by cleanupOld() below.
   */
  async dismiss({
    notificationId,
    projectId,
    aclContext,
  }: {
    notificationId: string
    projectId: string
    aclContext: AclContext
  }): Promise<{ success: true }> {
    const notification = await this.findOwned({
      notificationId,
      projectId,
      aclContext,
    })
    await this.getRepoNotification().updateOne(
      { _id: notification._id },
      { $set: { status: 'dismissed', dismissedAt: new Date() } },
    )
    return { success: true }
  }

  /**
   * Invoked hourly by the seeded 'notification'/'cleanupOld' Task (replaces
   * DataTransferJob's former cleanupOld()/seeded task). Deletes settled
   * (read/dismissed) notifications past their retention window, and their
   * related DataTransferJob row alongside them - a job whose notification
   * has aged out has no remaining purpose. Never touches the job's
   * resultFileId File; that has its own independent expiry/cleanup
   * mechanism (ServiceFileTempDownload).
   */
  async cleanupOld({
    olderThan = 'PT12H',
  }: { olderThan?: string } = {}): Promise<{ deletedCount: number }> {
    const cutoffDate = momentTimezone()
      .subtract(momentTimezone.duration(olderThan))
      .toDate()

    const repo = this.getRepoNotification()
    const settled = await repo.findSettledOlderThan(cutoffDate)

    const serviceDataTransferJob =
      this.getService<ServiceDataTransferJob>('dataTransferJob')
    await Promise.all(
      settled
        .map((notification) => notification.dataTransferJobId)
        .filter((dataTransferJobId): dataTransferJobId is string => !!dataTransferJobId)
        .map((dataTransferJobId) =>
          serviceDataTransferJob.deleteSettledJob(dataTransferJobId),
        ),
    )

    const deletedCount = await repo.deleteByIds(
      settled.map((notification) => notification._id),
    )
    return { deletedCount }
  }
}

export default ServiceNotification
