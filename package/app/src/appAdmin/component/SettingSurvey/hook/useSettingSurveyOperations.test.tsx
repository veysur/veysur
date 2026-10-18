import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingSurvey } from 'veysur-common'

import { getSettingSurveyApi } from '../registry'
import { KEY_STATE_SETTING_SURVEY } from '../common/keyState'
import { useSettingSurveyOperations } from './useSettingSurveyOperations'

jest.mock('appAdmin/hook', () => ({
  useAuth: () => ({ auth: { accessToken: { token: 'token' } } }),
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('hook/useAuth', () => ({
  useAuth: () => ({ authRefreshWithRetry: jest.fn() }),
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
            effectiveSettings: undefined,
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

describe('useSettingSurveyOperations - save', () => {
  it('refetches the settings, keeping them readable, instead of overwriting the cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidate = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)
    const setQueryData = jest.spyOn(queryClient, 'setQueryData')
    const patch = jest.fn().mockResolvedValue({})
    jest.mocked(getSettingSurveyApi).mockReturnValue({ patch } as never)
    const markClean = jest.fn()

    const { result } = renderHook(
      () =>
        useSettingSurveyOperations({
          useSettingSurveyState: {
            settingSurvey: new SettingSurvey(),
            serverSettingSurvey: undefined,
            effectiveSettings: undefined,
            isLoading: false,
            isFetching: false,
            isError: false,
            error: null,
            isDirty: true,
            updateLocalSettingSurvey: jest.fn(),
            resetToServer: jest.fn(),
            markClean,
          },
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.save()

    expect(patch).toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SETTING_SURVEY, 'project-1'],
    })
    expect(setQueryData).not.toHaveBeenCalled()
    expect(markClean).toHaveBeenCalled()
  })
})

describe('useSettingSurveyOperations - bot protection keys', () => {
  it('edits one field of a provider without touching its other keys', () => {
    const queryClient = new QueryClient()
    const updateLocalSettingSurvey = jest.fn()
    const { result } = renderHook(
      () =>
        useSettingSurveyOperations({
          useSettingSurveyState: {
            settingSurvey: undefined,
            serverSettingSurvey: undefined,
            effectiveSettings: undefined,
            isLoading: false,
            isFetching: false,
            isError: false,
            error: null,
            isDirty: false,
            updateLocalSettingSurvey,
            resetToServer: jest.fn(),
            markClean: jest.fn(),
          },
        }),
      { wrapper: createWrapper(queryClient) },
    )

    result.current.operations.updateSettingSurveyBotProtectionProperty(
      'cloudflare.secretKey',
      'new-secret',
    )

    const updater = updateLocalSettingSurvey.mock.calls[0][0]
    const updated = updater(
      new SettingSurvey({
        botProtection: {
          provider: 'cloudflare',
          cloudflare: { siteKey: 'site', secretKey: '', hasSecret: true },
        },
      }),
    )
    expect(updated.botProtection.cloudflare).toEqual({
      siteKey: 'site',
      secretKey: 'new-secret',
      hasSecret: true,
    })
    expect(updated.botProtection.provider).toBe('cloudflare')
  })
})
