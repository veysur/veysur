import { ServiceImportExport } from './ServiceImportExport'
import { asPrivate } from 'test-utils/asPrivate'
import * as common from 'common'

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn(),
  getObjectSize: jest.fn(),
  generateSignedUploadUrl: jest.fn(),
}))

type ServicePrivateOverrides = {
  entityHandlerRegistry: { get: jest.Mock }
  formatRegistry: { getByFormat: jest.Mock }
  getStorageConfig: jest.Mock
}

const withPrivates = (service: ServiceImportExport) =>
  asPrivate<ServiceImportExport, ServicePrivateOverrides>(service)

describe('ServiceImportExport.export()', () => {
  let service: ServiceImportExport
  let mockHandler: {
    getSupportedFormats: jest.Mock
    estimateExportSize: jest.Mock
    fetchForExport: jest.Mock
    prepareExportData: jest.Mock
  }
  let mockDataTransferJob: { enqueueExport: jest.Mock }
  let mockFileTempDownload: { createTempDownloadFromStream: jest.Mock }
  let mockRepoSurvey: { findOne: jest.Mock }

  const baseParams = {
    entityId: 'entity-1',
    projectId: 'project-1',
    aclConditions: {},
    aclContext: { jwt: { _id: 'user-1' } },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceImportExport()

    mockHandler = {
      getSupportedFormats: jest.fn().mockReturnValue(['vssp']),
      estimateExportSize: jest.fn().mockResolvedValue(2 * 1024 * 1024),
      fetchForExport: jest.fn(),
      prepareExportData: jest.fn(),
    }
    withPrivates(service).entityHandlerRegistry = {
      get: jest.fn().mockReturnValue(mockHandler),
    }

    mockDataTransferJob = {
      enqueueExport: jest
        .fn()
        .mockResolvedValue({ jobId: 'job-1', status: 'pending' }),
    }
    mockFileTempDownload = { createTempDownloadFromStream: jest.fn() }
    mockRepoSurvey = {
      findOne: jest.fn().mockResolvedValue({ name: 'My Survey' }),
    }

    jest.spyOn(service, 'getService').mockImplementation(((
      name: string,
    ) => {
      if (name === 'dataTransferJob') return mockDataTransferJob
      if (name === 'fileTempDownload') return mockFileTempDownload
      return {}
    }) as typeof service.getService)

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'survey') return mockRepoSurvey
      return {}
    }) as typeof service.getRepo)
  })

  test('throws for a format the handler does not support', async () => {
    await expect(
      service.export({ ...baseParams, entityType: 'surveyPublication', format: 'nope' }),
    ).rejects.toThrow()
    expect(mockDataTransferJob.enqueueExport).not.toHaveBeenCalled()
    expect(mockHandler.fetchForExport).not.toHaveBeenCalled()
  })

  test('enqueues an async job and returns immediately when the estimated size exceeds the threshold', async () => {
    const result = await service.export({
      ...baseParams,
      entityType: 'surveyPublication',
      format: 'vssp',
    })

    expect(result).toEqual({ async: true, jobId: 'job-1', status: 'pending' })
    expect(mockDataTransferJob.enqueueExport).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'surveyPublication',
        entityId: 'entity-1',
        format: 'vssp',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        label: 'My Survey (.vssp)',
      }),
    )
    expect(mockHandler.fetchForExport).not.toHaveBeenCalled()
  })

  test('resolves a null label when the survey cannot be found', async () => {
    mockRepoSurvey.findOne.mockResolvedValue(null)

    await service.export({
      ...baseParams,
      entityType: 'surveyPublication',
      format: 'vssp',
    })

    expect(mockDataTransferJob.enqueueExport).toHaveBeenCalledWith(
      expect.objectContaining({ label: null }),
    )
  })

  test('compiles synchronously when the estimated size is at or below the threshold', async () => {
    mockHandler.estimateExportSize.mockResolvedValue(1024)
    mockHandler.fetchForExport.mockResolvedValue({ some: 'entity' })
    mockHandler.prepareExportData.mockResolvedValue('stream' as never)
    withPrivates(service).formatRegistry = {
      getByFormat: jest.fn().mockReturnValue({
        getFilename: jest.fn().mockReturnValue('x.vssp'),
        getMimeType: jest.fn().mockReturnValue('application/octet-stream'),
      }),
    }
    mockFileTempDownload.createTempDownloadFromStream.mockResolvedValue({
      fileId: 'file-1',
      downloadUrl: 'https://example.com/file-1',
      filename: 'x.vssp',
      expiresAt: new Date(),
    })

    const result = await service.export({
      ...baseParams,
      entityType: 'surveyPublication',
      format: 'vssp',
    })

    expect(result).toEqual(
      expect.objectContaining({ fileId: 'file-1' }),
    )
    expect(mockDataTransferJob.enqueueExport).not.toHaveBeenCalled()
    expect(mockHandler.fetchForExport).toHaveBeenCalled()
  })

  test('compiles synchronously when the handler has no estimateExportSize method', async () => {
    delete (mockHandler as { estimateExportSize?: jest.Mock }).estimateExportSize
    mockHandler.fetchForExport.mockResolvedValue({ some: 'entity' })
    mockHandler.prepareExportData.mockResolvedValue('stream' as never)
    withPrivates(service).formatRegistry = {
      getByFormat: jest.fn().mockReturnValue({
        getFilename: jest.fn().mockReturnValue('x.vssp'),
        getMimeType: jest.fn().mockReturnValue('application/octet-stream'),
      }),
    }
    mockFileTempDownload.createTempDownloadFromStream.mockResolvedValue({
      fileId: 'file-1',
      downloadUrl: 'https://example.com/file-1',
      filename: 'x.vssp',
      expiresAt: new Date(),
    })

    const result = await service.export({
      ...baseParams,
      entityType: 'surveyPublication',
      format: 'vssp',
    })

    expect(result).toEqual(expect.objectContaining({ fileId: 'file-1' }))
    expect(mockDataTransferJob.enqueueExport).not.toHaveBeenCalled()
  })
})

describe('ServiceImportExport.compileExport()', () => {
  test('runs the synchronous compile path directly, ignoring the size threshold', async () => {
    const service = new ServiceImportExport()
    const mockHandler = {
      getSupportedFormats: jest.fn().mockReturnValue(['vssp']),
      estimateExportSize: jest.fn().mockResolvedValue(2 * 1024 * 1024),
      fetchForExport: jest.fn().mockResolvedValue({ some: 'entity' }),
      prepareExportData: jest.fn().mockResolvedValue('stream' as never),
    }
    withPrivates(service).entityHandlerRegistry = {
      get: jest.fn().mockReturnValue(mockHandler),
    }
    withPrivates(service).formatRegistry = {
      getByFormat: jest.fn().mockReturnValue({
        getFilename: jest.fn().mockReturnValue('x.vssp'),
        getMimeType: jest.fn().mockReturnValue('application/octet-stream'),
      }),
    }
    const mockFileTempDownload = {
      createTempDownloadFromStream: jest.fn().mockResolvedValue({
        fileId: 'file-1',
        downloadUrl: 'https://example.com/file-1',
        filename: 'x.vssp',
        expiresAt: new Date(),
      }),
    }
    jest.spyOn(service, 'getService').mockImplementation(((
      name: string,
    ) => {
      if (name === 'fileTempDownload') return mockFileTempDownload
      throw new Error(`unexpected getService('${name}'): compileExport() must not enqueue`)
    }) as typeof service.getService)

    const result = await service.compileExport({
      entityType: 'surveyPublication',
      entityId: 'entity-1',
      format: 'vssp',
      projectId: 'project-1',
      aclConditions: {},
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(result).toEqual(expect.objectContaining({ fileId: 'file-1' }))
    expect(mockHandler.fetchForExport).toHaveBeenCalled()
  })
})

describe('ServiceImportExport.processImport() / getImportStatus()', () => {
  let service: ServiceImportExport
  let mockRepoFile: { findOne: jest.Mock; updateOne: jest.Mock }
  let mockDataTransferJob: { enqueueImport: jest.Mock }

  const importFile = (overrides: Record<string, unknown> = {}) => ({
    _id: 'file-1',
    filePath: 'private/import.vssp',
    filename: 'my-upload.vssp',
    import: {
      entityType: 'surveyPublication',
      format: 'vssp',
      options: {},
      status: 'pending',
      result: null,
    },
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceImportExport()
    mockRepoFile = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    mockDataTransferJob = {
      enqueueImport: jest
        .fn()
        .mockResolvedValue({ jobId: 'job-1', status: 'pending' }),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'file') return mockRepoFile
      return {}
    }) as typeof service.getRepo)

    jest.spyOn(service, 'getService').mockImplementation(((
      name: string,
    ) => {
      if (name === 'dataTransferJob') return mockDataTransferJob
      throw new Error(`unexpected getService('${name}')`)
    }) as typeof service.getService)

    withPrivates(service).getStorageConfig = jest
      .fn()
      .mockReturnValue({ privateBucket: 'private-bucket' })
    ;(common.createStorageAdaptor as jest.Mock).mockReturnValue({})
  })

  test('marks the file queued and enqueues a job when the uploaded file exceeds the size threshold', async () => {
    mockRepoFile.findOne.mockResolvedValue(importFile())
    ;(common.getObjectSize as jest.Mock).mockResolvedValue(5 * 1024 * 1024)

    const result = await service.processImport({
      fileId: 'file-1',
      projectId: 'project-1',
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(result).toEqual({ async: true, jobId: 'job-1', status: 'pending' })
    expect(mockRepoFile.updateOne).toHaveBeenCalledWith(
      { _id: 'file-1' },
      { $set: { 'import.status': 'queued' } },
      expect.anything(),
    )
    expect(mockDataTransferJob.enqueueImport).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'file-1',
        entityType: 'surveyPublication',
        format: 'vssp',
        projectId: 'project-1',
        requestedByUserId: 'user-1',
        label: 'my-upload.vssp',
      }),
    )
  })

  test('runs the import synchronously when the uploaded file is at or below the size threshold', async () => {
    mockRepoFile.findOne.mockResolvedValue(importFile())
    ;(common.getObjectSize as jest.Mock).mockResolvedValue(1024)
    const runImportSpy = jest
      .spyOn(service, 'runImport')
      .mockResolvedValue({ success: true, entityId: 'survey-1' } as never)

    const result = await service.processImport({
      fileId: 'file-1',
      projectId: 'project-1',
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(result).toEqual({ success: true, entityId: 'survey-1' })
    expect(mockDataTransferJob.enqueueImport).not.toHaveBeenCalled()
    expect(runImportSpy).toHaveBeenCalledWith({
      fileId: 'file-1',
      projectId: 'project-1',
      aclContext: { jwt: { _id: 'user-1' } },
    })
  })

  test('rejects a second process call while a job is already queued', async () => {
    mockRepoFile.findOne.mockResolvedValue(
      importFile({ import: { ...importFile().import, status: 'queued' } }),
    )

    await expect(
      service.processImport({
        fileId: 'file-1',
        projectId: 'project-1',
        aclContext: { jwt: { _id: 'user-1' } },
      }),
    ).rejects.toThrow()
    expect(mockDataTransferJob.enqueueImport).not.toHaveBeenCalled()
  })

  test('returns the stored result without re-running a completed import', async () => {
    const storedResult = { success: true, entityId: 'survey-1' }
    mockRepoFile.findOne.mockResolvedValue(
      importFile({
        import: { ...importFile().import, status: 'completed', result: storedResult },
      }),
    )

    const result = await service.processImport({
      fileId: 'file-1',
      projectId: 'project-1',
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(result).toEqual(storedResult)
    expect(mockDataTransferJob.enqueueImport).not.toHaveBeenCalled()
  })

  test('getImportStatus() returns the file import status and result', async () => {
    mockRepoFile.findOne.mockResolvedValue(
      importFile({
        import: { ...importFile().import, status: 'completed', result: { success: true } },
      }),
    )

    const result = await service.getImportStatus({
      fileId: 'file-1',
      projectId: 'project-1',
    })

    expect(result).toEqual({
      fileId: 'file-1',
      status: 'completed',
      result: { success: true },
    })
  })

  test('getImportStatus() throws not-found for a missing file', async () => {
    mockRepoFile.findOne.mockResolvedValue(null)

    await expect(
      service.getImportStatus({ fileId: 'missing', projectId: 'project-1' }),
    ).rejects.toThrow()
  })
})

describe('ServiceImportExport.generateImportUrl()', () => {
  let service: ServiceImportExport
  let mockHandler: { getSupportedFormats: jest.Mock }
  let mockFormatHandler: { extensions: string[]; getMimeType: jest.Mock }
  let mockRepoFile: { create: jest.Mock; updateOne: jest.Mock }
  let mockDataTransferJob: { findActiveImportJob: jest.Mock }

  const baseParams = {
    entityType: 'surveyFull',
    format: 'vssa',
    fileHash: 'hash-1',
    projectId: 'project-1',
    aclContext: { jwt: { _id: 'user-1' } },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceImportExport()

    mockHandler = { getSupportedFormats: jest.fn().mockReturnValue(['vssa']) }
    withPrivates(service).entityHandlerRegistry = {
      get: jest.fn().mockReturnValue(mockHandler),
    }

    mockFormatHandler = {
      extensions: ['.vssa'],
      getMimeType: jest.fn().mockReturnValue('application/octet-stream'),
    }
    withPrivates(service).formatRegistry = {
      getByFormat: jest.fn().mockReturnValue(mockFormatHandler),
    }

    mockRepoFile = {
      create: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    mockDataTransferJob = {
      findActiveImportJob: jest.fn().mockResolvedValue(null),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'file') return mockRepoFile
      return {}
    }) as typeof service.getRepo)

    jest.spyOn(service, 'getService').mockImplementation(((
      name: string,
    ) => {
      if (name === 'dataTransferJob') return mockDataTransferJob
      throw new Error(`unexpected getService('${name}')`)
    }) as typeof service.getService)

    withPrivates(service).getStorageConfig = jest
      .fn()
      .mockReturnValue({ privateBucket: 'private-bucket' })
    ;(common.generateSignedUploadUrl as jest.Mock).mockResolvedValue(
      'https://example.com/upload',
    )
  })

  test('short-circuits to alreadyQueued without creating a File when an active job matches', async () => {
    mockDataTransferJob.findActiveImportJob.mockResolvedValue({
      _id: 'existing-job',
      status: 'processing',
    })

    const result = await service.generateImportUrl(baseParams)

    expect(result).toEqual({
      alreadyQueued: true,
      jobId: 'existing-job',
      status: 'processing',
    })
    expect(mockRepoFile.create).not.toHaveBeenCalled()
    expect(common.generateSignedUploadUrl).not.toHaveBeenCalled()
  })

  test('creates a File record with the given hash when no active job matches', async () => {
    const result = await service.generateImportUrl(baseParams)

    expect('alreadyQueued' in result).toBe(false)
    expect(mockRepoFile.create).toHaveBeenCalledTimes(1)
    const created = mockRepoFile.create.mock.calls[0][0]
    expect(created.hash).toBe('hash-1')
  })

  test('proceeds normally, storing a null hash, when no fileHash is given', async () => {
    const { fileHash: _fileHash, ...paramsWithoutHash } = baseParams

    await service.generateImportUrl(paramsWithoutHash)

    expect(mockDataTransferJob.findActiveImportJob).toHaveBeenCalledWith(
      expect.objectContaining({ sourceFileHash: undefined }),
    )
    const created = mockRepoFile.create.mock.calls[0][0]
    expect(created.hash).toBeNull()
  })
})
