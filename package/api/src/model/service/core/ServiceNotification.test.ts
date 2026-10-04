import {
  Notification,
  DataTransferJob,
  REALTIME_EVENT_NOTIFICATION_CHANGED,
} from 'veysur-common'

import { ServiceNotification } from './ServiceNotification'
import { asPrivate } from 'test-utils/asPrivate'

const generateSignedDownloadUrl = jest.fn()

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn().mockReturnValue({}),
  generateSignedDownloadUrl: (...args: unknown[]) =>
    generateSignedDownloadUrl(...args),
}))

type ServicePrivateOverrides = { config: unknown }
const withPrivates = (service: ServiceNotification) =>
  asPrivate<ServiceNotification, ServicePrivateOverrides>(service)

describe('ServiceNotification', () => {
  let service: ServiceNotification
  let mockRepo: {
    insertOne: jest.Mock
    findOne: jest.Mock
    updateOne: jest.Mock
    findByRecipient: jest.Mock
    findSettledOlderThan: jest.Mock
    deleteByIds: jest.Mock
    count: jest.Mock
  }
  let mockRepoFile: { findOne: jest.Mock }
  let mockServiceDataTransferJob: { deleteSettledJob: jest.Mock }
  let mockRealtime: { emitToUser: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceNotification()
    withPrivates(service).config = {
      model: { app: { s3: { type: 'local', privateBucket: 'private' } } },
    }

    mockRepo = {
      insertOne: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue(undefined),
      findByRecipient: jest.fn().mockResolvedValue([]),
      findSettledOlderThan: jest.fn().mockResolvedValue([]),
      deleteByIds: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(0),
    }
    mockRepoFile = { findOne: jest.fn().mockResolvedValue(null) }
    mockServiceDataTransferJob = { deleteSettledJob: jest.fn().mockResolvedValue(undefined) }

    mockRealtime = { emitToUser: jest.fn().mockResolvedValue(undefined) }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'notification') return mockRepo
      if (name === 'file') return mockRepoFile
      return {}
    }) as typeof service.getRepo)
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      if (name === 'dataTransferJob') return mockServiceDataTransferJob
      if (name === 'realtime') return mockRealtime
      return {}
    }) as typeof service.getService)
  })

  describe('create()', () => {
    test('inserts an unread notification related to the given job', async () => {
      const notification = await service.create({
        type: 'dataTransferJob',
        projectId: 'project-1',
        recipientUserId: 'user-1',
        dataTransferJobId: 'job-1',
        level: 'info',
        title: 'Export (.csv)',
      })

      expect(mockRepo.insertOne).toHaveBeenCalledTimes(1)
      expect(notification.status).toBe('unread')
      expect(notification.dataTransferJobId).toBe('job-1')
      expect(notification.level).toBe('info')
      expect(mockRealtime.emitToUser).toHaveBeenCalledWith(
        'user-1',
        REALTIME_EVENT_NOTIFICATION_CHANGED,
      )
    })
  })

  describe('updateForDataTransferJob()', () => {
    test('updates level/title/message and resets to unread', async () => {
      await service.updateForDataTransferJob({
        dataTransferJobId: 'job-1',
        level: 'success',
        title: 'Export (.csv)',
        message: 'Ready to download.',
      })

      expect(mockRepo.updateOne).toHaveBeenCalledWith(
        { dataTransferJobId: 'job-1' },
        {
          $set: {
            level: 'success',
            title: 'Export (.csv)',
            message: 'Ready to download.',
            status: 'unread',
            readAt: null,
            dismissedAt: null,
          },
        },
      )
    })
  })

  describe('updateForDataTransferJob() realtime', () => {
    test('emits to the notification recipient', async () => {
      mockRepo.findOne.mockResolvedValue({ recipientUserId: 'user-9' })

      await service.updateForDataTransferJob({
        dataTransferJobId: 'job-1',
        level: 'success',
        title: 'Export',
      })

      expect(mockRealtime.emitToUser).toHaveBeenCalledWith(
        'user-9',
        REALTIME_EVENT_NOTIFICATION_CHANGED,
      )
    })

    test('does not emit when the notification is gone', async () => {
      mockRepo.findOne.mockResolvedValue(null)

      await service.updateForDataTransferJob({
        dataTransferJobId: 'job-1',
        level: 'success',
        title: 'Export',
      })

      expect(mockRealtime.emitToUser).not.toHaveBeenCalled()
    })
  })

  describe('list()', () => {
    test('resolves a download URL for a completed job and surfaces its status', async () => {
      const dataTransferJob = new DataTransferJob({
        _id: 'job-1',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'completed',
        resultFileId: 'file-1',
      })
      mockRepo.findByRecipient.mockResolvedValue([
        new Notification({
          _id: 'notification-1',
          projectId: 'project-1',
          recipientUserId: 'user-1',
          dataTransferJobId: 'job-1',
          dataTransferJob,
          level: 'success',
          title: 'Export (.csv)',
          status: 'unread',
        }),
      ])
      mockRepoFile.findOne.mockResolvedValue({
        _id: 'file-1',
        filePath: 'path/to/file.csv',
        filename: 'file.csv',
        deletedAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      generateSignedDownloadUrl.mockResolvedValue('https://example.com/download')

      const result = await service.list({
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' } },
      })

      expect(result.notifications).toHaveLength(1)
      expect(result.notifications[0]).toEqual(
        expect.objectContaining({
          notificationId: 'notification-1',
          dataTransferJobStatus: 'completed',
          downloadUrl: 'https://example.com/download',
        }),
      )
    })

    test('resolves the download URL using the job\'s own requestHost/requestProto', async () => {
      const dataTransferJob = new DataTransferJob({
        _id: 'job-1',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'completed',
        resultFileId: 'file-1',
        requestHost: 'project-1.veysur.com',
        requestProto: 'https',
      })
      mockRepo.findByRecipient.mockResolvedValue([
        new Notification({
          _id: 'notification-1',
          projectId: 'project-1',
          recipientUserId: 'user-1',
          dataTransferJobId: 'job-1',
          dataTransferJob,
          status: 'unread',
        }),
      ])
      mockRepoFile.findOne.mockResolvedValue({
        _id: 'file-1',
        filePath: 'path/to/file.csv',
        filename: 'file.csv',
        deletedAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      generateSignedDownloadUrl.mockResolvedValue('https://example.com/download')

      await service.list({
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' } },
      })

      expect(generateSignedDownloadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ publicBaseUrl: 'https://project-1.veysur.com' }),
        expect.anything(),
        expect.anything(),
        'path/to/file.csv',
        expect.anything(),
      )
    })

    test('surfaces a notification whose job row no longer exists as failed', async () => {
      mockRepo.findByRecipient.mockResolvedValue([
        new Notification({
          _id: 'notification-1',
          projectId: 'project-1',
          recipientUserId: 'user-1',
          dataTransferJobId: 'missing-job',
          level: 'info',
          title: 'Import survey',
          status: 'read',
        }),
      ])

      const result = await service.list({
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' } },
      })

      expect(result.notifications[0]).toEqual(
        expect.objectContaining({
          notificationId: 'notification-1',
          dataTransferJobStatus: 'failed',
          dataTransferJobError: 'This job is no longer available.',
        }),
      )
    })

    test('excludes dismissed notifications from the count query', async () => {
      await service.list({
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' } },
      })

      expect(mockRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({ status: { $ne: 'dismissed' } }),
      )
    })
  })

  describe('dismiss()', () => {
    test('marks the notification dismissed without touching the related job', async () => {
      mockRepo.findOne.mockResolvedValue(
        new Notification({
          _id: 'notification-1',
          projectId: 'project-1',
          recipientUserId: 'user-1',
          dataTransferJobId: 'job-1',
        }),
      )

      await service.dismiss({
        notificationId: 'notification-1',
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' } },
      })

      expect(mockRepo.updateOne).toHaveBeenCalledWith(
        { _id: 'notification-1' },
        expect.objectContaining({ $set: expect.objectContaining({ status: 'dismissed' }) }),
      )
      expect(mockServiceDataTransferJob.deleteSettledJob).not.toHaveBeenCalled()
      expect(mockRealtime.emitToUser).toHaveBeenCalledWith(
        'user-1',
        REALTIME_EVENT_NOTIFICATION_CHANGED,
      )
    })

    test('rejects a notification owned by a different user', async () => {
      mockRepo.findOne.mockResolvedValue(
        new Notification({
          _id: 'notification-1',
          projectId: 'project-1',
          recipientUserId: 'someone-else',
        }),
      )

      await expect(
        service.dismiss({
          notificationId: 'notification-1',
          projectId: 'project-1',
          aclContext: { jwt: { _id: 'user-1' } },
        }),
      ).rejects.toThrow()
    })
  })

  describe('cleanupOld()', () => {
    test('deletes settled notifications and their related job rows', async () => {
      mockRepo.findSettledOlderThan.mockResolvedValue([
        new Notification({ _id: 'notification-1', dataTransferJobId: 'job-1', status: 'dismissed' }),
        new Notification({ _id: 'notification-2', dataTransferJobId: null, status: 'read' }),
      ])
      mockRepo.deleteByIds.mockResolvedValue(2)

      const result = await service.cleanupOld()

      expect(result).toEqual({ deletedCount: 2 })
      expect(mockServiceDataTransferJob.deleteSettledJob).toHaveBeenCalledTimes(1)
      expect(mockServiceDataTransferJob.deleteSettledJob).toHaveBeenCalledWith('job-1')
      expect(mockRepo.deleteByIds).toHaveBeenCalledWith(['notification-1', 'notification-2'])
    })
  })
})
