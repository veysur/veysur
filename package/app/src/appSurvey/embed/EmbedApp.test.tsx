import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import { queryClient } from 'common'

import { EmbedApp } from './EmbedApp'
import type { SurveyEmbedPointer } from './types'

const mockAuthenticate = jest.fn()
const mockSaveResponse = jest.fn()

jest.mock('appSurvey/registry', () => ({
  getAuthParticipantApi: () => ({ authenticate: mockAuthenticate }),
  getSurveyParticipantResponseApi: () => ({ saveResponse: mockSaveResponse }),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock('component/Survey', () => ({
  Survey: ({
    onSaveResponse,
  }: {
    onSaveResponse: (answers: Record<string, string>) => Promise<void>
  }) => (
    <button onClick={() => onSaveResponse({ q1: 'a' })}>survey-rendered</button>
  ),
  SurveyPageContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SurveyUnavailableCard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

jest.mock('./useEmbedResize', () => ({ useEmbedResize: jest.fn() }))

const makePointer = (
  overrides: Partial<SurveyEmbedPointer['access']> = {},
): SurveyEmbedPointer => ({
  version: 1,
  surveyId: 's1',
  snapshotId: 'snap1',
  publicationId: 'pub1',
  languages: ['en'],
  defaultLanguage: 'en',
  access: { embed: true, embedDomains: [], open: true, ...overrides },
  noBrandAvailable: true,
  settingSurveyData: {
    _id: 'setting',
  } as SurveyEmbedPointer['settingSurveyData'],
})

const mockFetch = (pointer: SurveyEmbedPointer | null) => {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const isPointer = String(url).endsWith('current.json')
    if (isPointer && !pointer) {
      return { ok: false, status: 404 } as Response
    }
    return {
      ok: true,
      json: async () =>
        isPointer
          ? pointer
          : { snapshotData: { survey: { _id: 's1', title: { en: 'Hi' } } } },
    } as Response
  })
}

const setReferrer = (value: string) =>
  Object.defineProperty(document, 'referrer', {
    value,
    configurable: true,
  })

describe('EmbedApp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    queryClient.clear()
    window.history.pushState({}, '', '/embed/p1/s1')
    setReferrer('https://host.example/page')
    mockAuthenticate.mockResolvedValue({ jwt: 'jwt-1' })
    mockSaveResponse.mockResolvedValue(undefined)
  })

  test('renders the survey from the static files without authenticating', async () => {
    mockFetch(makePointer())

    render(<EmbedApp />)

    expect(await screen.findByText('survey-rendered')).toBeInTheDocument()
    expect(mockAuthenticate).not.toHaveBeenCalled()
  })

  test('authenticates with the embedding origin on the first answer', async () => {
    mockFetch(makePointer())
    render(<EmbedApp />)

    fireEvent.click(await screen.findByText('survey-rendered'))

    await waitFor(() => expect(mockSaveResponse).toHaveBeenCalled())
    expect(mockAuthenticate).toHaveBeenCalledWith(
      's1',
      undefined,
      undefined,
      'https://host.example',
    )
  })

  test('shows a message when the embedding site is not in the allowed list', async () => {
    mockFetch(makePointer({ embedDomains: ['allowed.example'] }))

    render(<EmbedApp />)

    expect(await screen.findByText('embed.notAllowedTitle')).toBeInTheDocument()
    expect(screen.queryByText('survey-rendered')).not.toBeInTheDocument()
  })

  test('allows a subdomain of a listed domain', async () => {
    setReferrer('https://www.host.example/page')
    mockFetch(makePointer({ embedDomains: ['host.example'] }))

    render(<EmbedApp />)

    expect(await screen.findByText('survey-rendered')).toBeInTheDocument()
  })

  test.each([
    ['the survey is no longer open', { open: false }],
    ['public registration is on', { publicReg: true }],
  ])('shows unavailable when %s', async (_name, access) => {
    mockFetch(makePointer(access))

    render(<EmbedApp />)

    expect(
      await screen.findByText('page.surveyUnavailableTitle'),
    ).toBeInTheDocument()
    expect(screen.queryByText('survey-rendered')).not.toBeInTheDocument()
  })

  test('shows unavailable when embedding is switched off or the pointer is missing', async () => {
    mockFetch(makePointer({ embed: false }))
    const { unmount } = render(<EmbedApp />)
    expect(
      await screen.findByText('page.surveyUnavailableTitle'),
    ).toBeInTheDocument()
    unmount()

    mockFetch(null)
    render(<EmbedApp />)
    expect(
      await screen.findByText('page.surveyUnavailableTitle'),
    ).toBeInTheDocument()
  })
})
