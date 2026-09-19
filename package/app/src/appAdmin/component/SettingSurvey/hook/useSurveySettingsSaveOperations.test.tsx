import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EmailTemplate } from 'veysur-common'

import { useSurveySettingsSaveOperations } from './useSurveySettingsSaveOperations'

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

describe('useSurveySettingsSaveOperations - handleSave', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPatch.mockResolvedValue({ ok: true })
  })

  it('clears dirty state only after cache invalidation has completed', async () => {
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

    const clearDirtyState = jest.fn()
    const emailTemplates = new Map<string, EmailTemplate>([
      [
        'welcome-en',
        {
          type: 'welcome',
          lang: 'en',
          subject: 'Hi',
          body: 'Body',
        } as EmailTemplate,
      ],
    ])

    const { result } = renderHook(
      () =>
        useSurveySettingsSaveOperations({
          save: jest.fn().mockResolvedValue(undefined),
          cancel: jest.fn(),
          isDirty: false,
          dirtyTemplates: new Set(['welcome-en']),
          deletedTemplates: new Set(),
          emailTemplates,
          operations: {} as Parameters<
            typeof useSurveySettingsSaveOperations
          >[0]['operations'],
          revertEmailTemplates: jest.fn(),
          clearDirtyState,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    const savePromise = result.current.handleSave()

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(clearDirtyState).not.toHaveBeenCalled()

    resolveInvalidate()
    await savePromise
    expect(clearDirtyState).toHaveBeenCalledTimes(1)
  })
})
