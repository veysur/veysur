import { DataTransferJob } from 'veysur-common'

import { ServiceDataTransferJob } from './ServiceDataTransferJob'
import { asPrivate } from 'test-utils/asPrivate'

const generateSignedDownloadUrl = jest.fn()

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn().mockReturnValue({}),
  generateSignedDownloadUrl: (...args: unknown[]) =>
    generateSignedDownloadUrl(...args),
}))

type ServicePrivateOverrides = { config: unknown }
const withPrivates = (service: ServiceDataTransferJob) =>
  asPrivate<ServiceDataTransferJob, ServicePrivateOverrides>(service)

describe('ServiceDataTransferJob', () => {
  let service: ServiceDataTransferJob
  let mockRepo: {
    insertOne: jest.Mock
    findOne: jest.Mock
    updateOne: jest.Mock
    deleteOne: jest.Mock
    findDuePending: jest.Mock
    findStale: jest.Mock
    findByRequester: jest.Mock
    findActiveMatch: jest.Mock
    findActiveImportMatch: jest.Mock
    count: jest.Mock
  }
  let mockRepoFile: { findOne: jest.Mock }
  let mockImportExport: { compileExport: jest.Mock; runImport: jest.Mock }
  let mockNotification: { create: jest.Mock; updateForDataTransferJob: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceDataTransferJob()
    withPrivates(service).config = {
      model: { app: { s3: { type: 'local', privateBucket: 'private' } } },
    }

    mockRepo = {
      insertOne: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue(undefined),
      deleteOne: jest.fn().mockResolvedValue({ count: 1 }),
      findDuePending: jest.fn().mockResolvedValue([]),
      findStale: jest.fn().mockResolvedValue([]),
      findByRequester: jest.fn().mockResolvedValue([]),
      findActiveMatch: jest.fn().mockResolvedValue([]),
      findActiveImportMatch: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }
    mockRepoFile = { findOne: jest.fn().mockResolvedValue(null) }
    mockImportExport = { compileExport: jest.fn(), runImport: jest.fn() }
    mockNotification = {
      create: jest.fn().mockResolvedValue(undefined),
      updateForDataTransferJob: jest.fn().mockResolvedValue(undefined),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'dataTransferJob') return mockRepo
      if (name === 'file') return mockRepoFile
      return {}
    }) as typeof service.getRepo)

    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      if (name === 'importExport') return mockImportExport
      if (name === 'notification') return mockNotification
      return {}
    }) as typeof service.getService)
  })

  describe('enqueueExport()', () => {
    test('creates a pending job row and returns its id', async () => {
      const result = await service.enqueueExport({
        entityType: 'surveyPublication',
        entityId: 'survey-1',
        format: 'vssp',
        options: { publicationId: 'pub-1' },
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        label: 'My Survey (survey-1)',
      })

      expect(result.status).toBe('pending')
      expect(mockRepo.insertOne).toHaveBeenCalledTimes(1)
      const inserted = mockRepo.insertOne.mock.calls[0][0] as DataTransferJob
      expect(inserted._id).toBe(result.jobId)
      expect(inserted.entityType).toBe('surveyPublication')
      expect(inserted.projectId).toBe('project-1')
      expect(inserted.requestedByUserId).toBe('user-1')
      expect(inserted.status).toBe('pending')
      expect(inserted.direction).toBe('export')
      expect(inserted.label).toBe('My Survey (survey-1)')
      expect(mockNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dataTransferJob',
          dataTransferJobId: result.jobId,
          recipientUserId: 'user-1',
          level: 'info',
          title: 'My Survey (survey-1)',
        }),
      )
    })

    test('no-ops and returns the existing job when a matching one is already active', async () => {
      mockRepo.findActiveMatch.mockResolvedValue([
        new DataTransferJob({
          _id: 'existing-job',
          entityType: 'surveyPublication',
          entityId: 'survey-1',
          format: 'vssp',
          options: { publicationId: 'pub-1' },
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'processing',
        }),
      ])

      const result = await service.enqueueExport({
        entityType: 'surveyPublication',
        entityId: 'survey-1',
        format: 'vssp',
        options: { publicationId: 'pub-1' },
        projectId: 'project-1',
        requestedByUserId: 'user-1',
      })

      expect(result).toEqual({
        jobId: 'existing-job',
        status: 'processing',
        alreadyQueued: true,
      })
      expect(mockRepo.insertOne).not.toHaveBeenCalled()
      expect(mockNotification.create).not.toHaveBeenCalled()
    })

    test('enqueues a new job when an active job exists but options differ', async () => {
      mockRepo.findActiveMatch.mockResolvedValue([
        new DataTransferJob({
          _id: 'existing-job',
          entityType: 'surveyPublication',
          entityId: 'survey-1',
          format: 'vssp',
          options: { publicationId: 'pub-1' },
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'processing',
        }),
      ])

      const result = await service.enqueueExport({
        entityType: 'surveyPublication',
        entityId: 'survey-1',
        format: 'vssp',
        options: { publicationId: 'pub-2' },
        projectId: 'project-1',
        requestedByUserId: 'user-1',
      })

      expect(result.alreadyQueued).toBeUndefined()
      expect(mockRepo.insertOne).toHaveBeenCalledTimes(1)
    })
  })

  describe('enqueueImport()', () => {
    test('creates a pending import job row referencing the source file', async () => {
      const result = await service.enqueueImport({
        fileId: 'file-1',
        entityType: 'surveyPublication',
        format: 'vssp',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        label: 'my-upload.vssp',
      })

      expect(result.status).toBe('pending')
      const inserted = mockRepo.insertOne.mock.calls[0][0] as DataTransferJob
      expect(inserted.direction).toBe('import')
      expect(inserted.sourceFileId).toBe('file-1')
      expect(inserted.entityType).toBe('surveyPublication')
      expect(inserted.projectId).toBe('project-1')
      expect(inserted.label).toBe('my-upload.vssp')
      expect(mockNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dataTransferJob',
          dataTransferJobId: result.jobId,
          recipientUserId: 'user-1',
          level: 'info',
          title: 'my-upload.vssp',
        }),
      )
    })

    test('stores the source file hash and options on the created job', async () => {
      await service.enqueueImport({
        fileId: 'file-1',
        entityType: 'surveyFull',
        format: 'vssa',
        options: { force: true },
        sourceFileHash: 'hash-1',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
      })

      const inserted = mockRepo.insertOne.mock.calls[0][0] as DataTransferJob
      expect(inserted.sourceFileHash).toBe('hash-1')
      expect(inserted.options).toEqual({ force: true })
    })

    test('returns the existing job when an active import exists for the same hash and options', async () => {
      mockRepo.findActiveImportMatch.mockResolvedValue([
        new DataTransferJob({
          _id: 'existing-job',
          direction: 'import',
          entityType: 'surveyFull',
          format: 'vssa',
          options: {},
          sourceFileHash: 'hash-1',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'processing',
        }),
      ])

      const result = await service.enqueueImport({
        fileId: 'file-2',
        entityType: 'surveyFull',
        format: 'vssa',
        options: {},
        sourceFileHash: 'hash-1',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
      })

      expect(result).toEqual({
        jobId: 'existing-job',
        status: 'processing',
        alreadyQueued: true,
      })
      expect(mockRepo.insertOne).not.toHaveBeenCalled()
      expect(mockNotification.create).not.toHaveBeenCalled()
    })

    test('enqueues a new job when an active import exists but options differ', async () => {
      mockRepo.findActiveImportMatch.mockResolvedValue([
        new DataTransferJob({
          _id: 'existing-job',
          direction: 'import',
          entityType: 'surveyPublication',
          format: 'vssp',
          options: { surveyId: 'survey-1' },
          sourceFileHash: 'hash-1',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'processing',
        }),
      ])

      const result = await service.enqueueImport({
        fileId: 'file-2',
        entityType: 'surveyPublication',
        format: 'vssp',
        options: { surveyId: 'survey-2' },
        sourceFileHash: 'hash-1',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
      })

      expect(result.alreadyQueued).toBeUndefined()
      expect(mockRepo.insertOne).toHaveBeenCalledTimes(1)
    })

    test('enqueues normally when no source file hash is provided', async () => {
      const result = await service.enqueueImport({
        fileId: 'file-1',
        entityType: 'surveyFull',
        format: 'vssa',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
      })

      expect(result.alreadyQueued).toBeUndefined()
      expect(mockRepo.findActiveImportMatch).not.toHaveBeenCalled()
      expect(mockRepo.insertOne).toHaveBeenCalledTimes(1)
    })
  })

  describe('getStatus()', () => {
    test('returns the job status for a job not yet completed', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({
          _id: 'job-1',
          projectId: 'project-1',
          status: 'processing',
        }),
      )

      const result = await service.getStatus({ jobId: 'job-1', projectId: 'project-1' })

      expect(result).toEqual({
        jobId: 'job-1',
        status: 'processing',
        resultFileId: null,
        error: null,
      })
    })

    test('surfaces an error when a completed job has no resolvable file', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({
          _id: 'job-1',
          projectId: 'project-1',
          status: 'completed',
          resultFileId: 'file-1',
        }),
      )
      // mockRepoFile.findOne defaults to resolving null (beforeEach) - the
      // File the job's resultFileId points to can't be found.

      const result = await service.getStatus({ jobId: 'job-1', projectId: 'project-1' })

      expect(result).toEqual({
        jobId: 'job-1',
        status: 'completed',
        resultFileId: 'file-1',
        error: 'Export file is no longer available',
      })
    })

    test('throws not-found for a job that does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null)

      await expect(
        service.getStatus({ jobId: 'missing', projectId: 'project-1' }),
      ).rejects.toThrow()
    })

    test('includes a fresh signed download URL when the job is completed', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({
          _id: 'job-1',
          projectId: 'project-1',
          status: 'completed',
          resultFileId: 'file-1',
        }),
      )
      mockRepoFile.findOne.mockResolvedValue({
        _id: 'file-1',
        filename: 'export.vssp',
        filePath: 'private/export.vssp',
        deletedAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      generateSignedDownloadUrl.mockResolvedValue('https://example.com/signed')

      const result = await service.getStatus({
        jobId: 'job-1',
        projectId: 'project-1',
      })

      expect(result.downloadUrl).toBe('https://example.com/signed')
      expect(result.filename).toBe('export.vssp')
    })

    test('throws for a job belonging to a different project', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({ _id: 'job-1', projectId: 'project-1' }),
      )

      await expect(
        service.getStatus({ jobId: 'job-1', projectId: 'other-project' }),
      ).rejects.toThrow()
    })
  })

  describe('listJobs()', () => {
    test('lists the calling user\'s own jobs, resolving download info for completed ones', async () => {
      mockRepo.count.mockResolvedValue(2)
      mockRepo.findByRequester.mockResolvedValue([
        new DataTransferJob({
          _id: 'job-1',
          direction: 'export',
          entityType: 'surveyFull',
          format: 'vssa',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'completed',
          resultFileId: 'file-1',
          label: 'My Survey (survey-1)',
        }),
        new DataTransferJob({
          _id: 'job-2',
          direction: 'export',
          entityType: 'survey',
          format: 'vsst',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'pending',
        }),
      ])
      mockRepoFile.findOne.mockResolvedValue({
        _id: 'file-1',
        filename: 'export.vssa',
        filePath: 'private/export.vssa',
        deletedAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      generateSignedDownloadUrl.mockResolvedValue('https://example.com/signed')

      const result = await service.listJobs({
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' }, projectId: 'project-1' },
      })

      expect(mockRepo.findByRequester).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          limit: 20,
          offset: 0,
        }),
      )
      expect(result.jobCount).toBe(2)
      expect(result.jobs).toHaveLength(2)
      expect(result.jobs[0]).toMatchObject({
        jobId: 'job-1',
        status: 'completed',
        downloadUrl: 'https://example.com/signed',
        filename: 'export.vssa',
        label: 'My Survey (survey-1)',
      })
      expect(result.jobs[1]).toMatchObject({ jobId: 'job-2', status: 'pending' })
    })
  })

  describe('deleteJob()', () => {
    test('deletes a settled job the caller owns', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({
          _id: 'job-1',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'completed',
        }),
      )

      const result = await service.deleteJob({
        jobId: 'job-1',
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' }, projectId: 'project-1' },
      })

      expect(result).toEqual({ success: true })
      expect(mockRepo.deleteOne).toHaveBeenCalledWith({ _id: 'job-1' })
    })

    test('throws not-found for a job belonging to a different project', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({
          _id: 'job-1',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'completed',
        }),
      )

      await expect(
        service.deleteJob({
          jobId: 'job-1',
          projectId: 'other-project',
          aclContext: { jwt: { _id: 'user-1' }, projectId: 'other-project' },
        }),
      ).rejects.toThrow()
      expect(mockRepo.deleteOne).not.toHaveBeenCalled()
    })

    test('throws not-found for a job belonging to a different user', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({
          _id: 'job-1',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'completed',
        }),
      )

      await expect(
        service.deleteJob({
          jobId: 'job-1',
          projectId: 'project-1',
          aclContext: { jwt: { _id: 'user-2' }, projectId: 'project-1' },
        }),
      ).rejects.toThrow()
      expect(mockRepo.deleteOne).not.toHaveBeenCalled()
    })

    test('rejects deleting a job that is still in progress', async () => {
      mockRepo.findOne.mockResolvedValue(
        new DataTransferJob({
          _id: 'job-1',
          projectId: 'project-1',
          requestedByUserId: 'user-1',
          status: 'processing',
        }),
      )

      await expect(
        service.deleteJob({
          jobId: 'job-1',
          projectId: 'project-1',
          aclContext: { jwt: { _id: 'user-1' }, projectId: 'project-1' },
        }),
      ).rejects.toThrow()
      expect(mockRepo.deleteOne).not.toHaveBeenCalled()
    })
  })

  describe('processQueue()', () => {
    test('marks a job completed with the resulting fileId on success', async () => {
      const job = new DataTransferJob({
        _id: 'job-1',
        entityType: 'surveyPublication',
        entityId: 'survey-1',
        format: 'vssp',
        options: { publicationId: 'pub-1' },
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'pending',
      })
      mockRepo.findDuePending.mockResolvedValue([job])
      mockImportExport.compileExport.mockResolvedValue({
        fileId: 'result-file-1',
        downloadUrl: 'https://example.com/download',
        filename: 'export.vssp',
        expiresAt: new Date(),
      })

      const result = await service.processQueue()

      expect(result).toEqual({ processed: 1, failed: 0 })
      expect(mockImportExport.compileExport).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'surveyPublication',
          entityId: 'survey-1',
          format: 'vssp',
          projectId: 'project-1',
          aclContext: { jwt: { _id: 'user-1' }, projectId: 'project-1' },
        }),
      )
      const setCalls = mockRepo.updateOne.mock.calls.map((c) => c[1].$set)
      expect(setCalls).toContainEqual(
        expect.objectContaining({ status: 'processing' }),
      )
      expect(setCalls).toContainEqual(
        expect.objectContaining({
          status: 'completed',
          resultFileId: 'result-file-1',
        }),
      )
      expect(mockNotification.updateForDataTransferJob).toHaveBeenCalledWith(
        expect.objectContaining({ dataTransferJobId: 'job-1', level: 'success' }),
      )
    })

    test('marks a job failed with the error message when export() throws', async () => {
      const job = new DataTransferJob({
        _id: 'job-1',
        entityType: 'surveyFull',
        entityId: 'survey-1',
        format: 'vssa',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'pending',
      })
      mockRepo.findDuePending.mockResolvedValue([job])
      mockImportExport.compileExport.mockRejectedValue(new Error('export blew up'))

      const result = await service.processQueue()

      expect(result).toEqual({ processed: 0, failed: 1 })
      const setCalls = mockRepo.updateOne.mock.calls.map((c) => c[1].$set)
      expect(setCalls).toContainEqual(
        expect.objectContaining({
          status: 'failed',
          error: 'export blew up',
        }),
      )
      expect(mockNotification.updateForDataTransferJob).toHaveBeenCalledWith(
        expect.objectContaining({
          dataTransferJobId: 'job-1',
          level: 'error',
          message: 'export blew up',
        }),
      )
    })

    test('does nothing when no jobs are due', async () => {
      mockRepo.findDuePending.mockResolvedValue([])

      const result = await service.processQueue()

      expect(result).toEqual({ processed: 0, failed: 0 })
      expect(mockImportExport.compileExport).not.toHaveBeenCalled()
    })

    test('runs an import job via runImport() with no resultFileId', async () => {
      const job = new DataTransferJob({
        _id: 'job-1',
        direction: 'import',
        sourceFileId: 'file-1',
        entityType: 'surveyPublication',
        format: 'vssp',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'pending',
      })
      mockRepo.findDuePending.mockResolvedValue([job])
      mockImportExport.runImport.mockResolvedValue({ success: true })

      const result = await service.processQueue()

      expect(result).toEqual({ processed: 1, failed: 0 })
      expect(mockImportExport.runImport).toHaveBeenCalledWith({
        fileId: 'file-1',
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' }, projectId: 'project-1' },
      })
      expect(mockImportExport.compileExport).not.toHaveBeenCalled()
      const setCalls = mockRepo.updateOne.mock.calls.map((c) => c[1].$set)
      expect(setCalls).toContainEqual(
        expect.objectContaining({ status: 'completed', resultFileId: null }),
      )
    })

    test('marks an import job failed with the error message when runImport() throws', async () => {
      const job = new DataTransferJob({
        _id: 'job-1',
        direction: 'import',
        sourceFileId: 'file-1',
        entityType: 'surveyPublication',
        format: 'vssp',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'pending',
      })
      mockRepo.findDuePending.mockResolvedValue([job])
      mockImportExport.runImport.mockRejectedValue(new Error('import blew up'))

      const result = await service.processQueue()

      expect(result).toEqual({ processed: 0, failed: 1 })
      const setCalls = mockRepo.updateOne.mock.calls.map((c) => c[1].$set)
      expect(setCalls).toContainEqual(
        expect.objectContaining({ status: 'failed', error: 'import blew up' }),
      )
    })
  })

  describe('processQueue() staleness', () => {
    test('fails a job wedged in pending, so it stops matching future dedup checks', async () => {
      const staleJob = new DataTransferJob({
        _id: 'stale-pending-1',
        direction: 'import',
        entityType: 'surveyFull',
        format: 'vssa',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'pending',
      })
      mockRepo.findStale.mockResolvedValue([staleJob])

      const result = await service.processQueue()

      expect(result).toEqual({ processed: 0, failed: 0 })
      expect(mockRepo.updateOne).toHaveBeenCalledWith(
        { _id: 'stale-pending-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'failed',
            error: 'Job timed out waiting to be processed.',
          }),
        }),
      )
      expect(mockNotification.updateForDataTransferJob).toHaveBeenCalledWith(
        expect.objectContaining({
          dataTransferJobId: 'stale-pending-1',
          level: 'error',
          message: 'Job timed out waiting to be processed.',
        }),
      )
    })

    test('fails a job wedged in processing with a distinct message', async () => {
      const staleJob = new DataTransferJob({
        _id: 'stale-processing-1',
        direction: 'export',
        entityType: 'surveyPublication',
        entityId: 'survey-1',
        format: 'vssp',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'processing',
      })
      mockRepo.findStale.mockResolvedValue([staleJob])

      await service.processQueue()

      expect(mockNotification.updateForDataTransferJob).toHaveBeenCalledWith(
        expect.objectContaining({
          dataTransferJobId: 'stale-processing-1',
          message: 'Job timed out during processing.',
        }),
      )
    })

    test('reaps before draining due jobs, in the same tick', async () => {
      const staleJob = new DataTransferJob({
        _id: 'stale-1',
        entityType: 'surveyPublication',
        entityId: 'survey-1',
        format: 'vssp',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        status: 'pending',
      })
      mockRepo.findStale.mockResolvedValue([staleJob])
      mockRepo.findDuePending.mockResolvedValue([])

      await service.processQueue()

      expect(mockRepo.findStale).toHaveBeenCalled()
      expect(mockRepo.updateOne).toHaveBeenCalledWith(
        { _id: 'stale-1' },
        expect.objectContaining({ $set: expect.objectContaining({ status: 'failed' }) }),
      )
    })
  })
})
