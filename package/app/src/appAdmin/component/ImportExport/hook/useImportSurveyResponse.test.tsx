import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  KEY_STATE_SURVEY_RESPONSE_LIST,
  KEY_STATE_SURVEY_STATS,
} from 'appAdmin/common'

import { useImportSurveyResponse } from './useImportSurveyResponse'
import { getImportExportApi } from '../registry'

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('../registry', () => ({
  getImportExportApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useImportSurveyResponse', () => {
  const surveyId = 'survey-1'
  const mockGenerateImportUrl = jest.fn()
  const mockUploadToS3 = jest.fn()
  const mockProcessImport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateImportUrl.mockResolvedValue({
      fileId: 'file-1',
      uploadUrl: 'https://example.com/upload',
    })
    mockUploadToS3.mockResolvedValue(undefined)
    mockProcessImport.mockResolvedValue({ imported: 1 })
    ;(getImportExportApi as jest.Mock).mockReturnValue({
      generateImportUrl: mockGenerateImportUrl,
      uploadToS3: mockUploadToS3,
      processImport: mockProcessImport,
    })
  })

  it('invalidates the response list and survey stats queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useImportSurveyResponse(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.importSurveyResponse({
      file: new File(['a'], 'a.csv'),
      surveyId,
      publicationId: 'publication-1',
      snapshotId: 'snapshot-1',
    })

    await waitFor(() => {
      expect(mockProcessImport).toHaveBeenCalledWith('file-1')
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_RESPONSE_LIST],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_STATS, surveyId],
    })
  })
})
