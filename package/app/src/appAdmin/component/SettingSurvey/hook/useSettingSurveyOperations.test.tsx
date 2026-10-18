import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useSettingSurveyOperations } from './useSettingSurveyOperations'

jest.mock('appAdmin/hook', () => ({
  useAuth: () => ({ auth: { accessToken: { token: 'token' } } }),
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('../registry', () => ({
  getSettingSurveyApi: jest.fn(),
}))

const mockPatch = jest.fn()
jest.mock('appAdmin/component/SurveySettingShared', () => ({
  ProjectEmailTemplateApi: jest.fn().mockImplementation(() => ({
    patch: mockPatch,
  })),
}))

jest.mock('registry', () => ({
  getRestClient: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSettingSurveyOperations - updateProjectEmailTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPatch.mockResolvedValue({ ok: true })
  })

  it('does not resolve until the email template cache invalidation completes', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let resolveInvalidate: () => void = () => {}
    const invalidatePromise = new Promise<void>((resolve) => {
      resolveInvalidate = resolve
    })
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockReturnValue(invalidatePromise)

    const { result } = renderHook(
      () =>
        useSettingSurveyOperations({
          useSettingSurveyState: {
            settingSurvey: undefined,
            serverSettingSurvey: undefined,
            isLoading: false,
            isFetching: false,
            isError: false,
            error: null,
            isDirty: false,
            updateLocalSettingSurvey: jest.fn(),
            resetToServer: jest.fn(),
            markClean: jest.fn(),
          },
        }),
      { wrapper: createWrapper(queryClient) },
    )

    let resolved = false
    const updatePromise = result.current.operations
      .updateProjectEmailTemplate('welcome', 'en', 'Subject', 'Body')
      .then(() => {
        resolved = true
      })

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(resolved).toBe(false)

    resolveInvalidate()
    await updatePromise
    expect(resolved).toBe(true)
  })
})
