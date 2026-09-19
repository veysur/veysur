import { render, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PageTeamInviteAccept } from './PageTeamInviteAccept'
import { getProjectAdminInviteApi } from '../registry'

jest.mock('../registry', () => ({
  getProjectAdminInviteApi: jest.fn(),
}))

// AccountPageLayout pulls in the full `appAccount/hook` barrel (billing/subscription hooks
// using `import.meta.env`, incompatible with Jest's CJS transform) — stub it with a passthrough
// since this test only exercises the invite-accept content, not the shared page chrome.
jest.mock('appAccount/component/Layout', () => ({
  AccountPageLayout: ({ children }: { children: React.ReactNode }) => children,
}))

const acceptNewAccountMock = jest.fn()

// Mocked as a standalone module (not spread over jest.requireActual('../hook')) — the real
// barrel re-exports billing/subscription hooks that use `import.meta.env`, which Jest's CJS
// transform can't parse. This test only needs the three invite hooks.
jest.mock('../hook', () => ({
  useProjectAdminInviteAccept: () => ({
    acceptInvite: jest.fn(),
    isLoading: false,
    error: null,
  }),
  useProjectAdminInviteDecline: () => ({
    declineInvite: jest.fn(),
    isLoading: false,
    error: null,
  }),
  useProjectAdminInviteAcceptNewAccount: () => ({
    acceptNewAccount: acceptNewAccountMock,
    isLoading: false,
    error: null,
  }),
}))

const createWrapper = (initialEntries: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/team-invite/accept" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('PageTeamInviteAccept', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches and renders invite details when code and email are present', async () => {
    const getInviteDetail = jest.fn().mockResolvedValue({
      project: { name: 'Acme Surveys' },
      invitedBy: { nameFirst: 'Jane', nameLast: 'Doe' },
    })
    ;(getProjectAdminInviteApi as jest.Mock).mockReturnValue({
      getInviteDetail,
    })

    const { findByText } = render(<PageTeamInviteAccept />, {
      wrapper: createWrapper([
        '/team-invite/accept?code=abc123&email=invitee@example.com',
      ]),
    })

    expect(await findByText(/Acme Surveys/)).toBeInTheDocument()
    expect(await findByText(/Jane Doe/)).toBeInTheDocument()
    expect(getInviteDetail).toHaveBeenCalledWith(
      'abc123',
      'invitee@example.com',
    )
  })

  it('shows an invalid-link message when code or email is missing', async () => {
    const getInviteDetail = jest.fn()
    ;(getProjectAdminInviteApi as jest.Mock).mockReturnValue({
      getInviteDetail,
    })

    const { findByText } = render(<PageTeamInviteAccept />, {
      wrapper: createWrapper(['/team-invite/accept?code=abc123']),
    })

    expect(await findByText(/Invalid invite link/)).toBeInTheDocument()
    await waitFor(() => expect(getInviteDetail).not.toHaveBeenCalled())
  })

  it('offers a choice between logging in and creating an account when unauthenticated', async () => {
    const getInviteDetail = jest.fn().mockResolvedValue({
      project: { name: 'Acme Surveys' },
      invitedBy: { nameFirst: 'Jane', nameLast: 'Doe' },
    })
    ;(getProjectAdminInviteApi as jest.Mock).mockReturnValue({
      getInviteDetail,
    })

    const { findByText, getByText } = render(<PageTeamInviteAccept />, {
      wrapper: createWrapper([
        '/team-invite/accept?code=abc123&email=invitee@example.com',
      ]),
    })

    expect(await findByText(/Acme Surveys/)).toBeInTheDocument()
    expect(getByText('I already have an account')).toBeInTheDocument()
    expect(getByText('Create an account')).toBeInTheDocument()
  })

  it('reveals the account-creation form when "Create an account" is chosen', async () => {
    const getInviteDetail = jest.fn().mockResolvedValue({
      project: { name: 'Acme Surveys' },
      invitedBy: { nameFirst: 'Jane', nameLast: 'Doe' },
    })
    ;(getProjectAdminInviteApi as jest.Mock).mockReturnValue({
      getInviteDetail,
    })

    const { findByText, getByText, getByLabelText } = render(
      <PageTeamInviteAccept />,
      {
        wrapper: createWrapper([
          '/team-invite/accept?code=abc123&email=invitee@example.com',
        ]),
      },
    )

    expect(await findByText(/Acme Surveys/)).toBeInTheDocument()
    fireEvent.click(getByText('Create an account'))

    expect(getByLabelText('First Name')).toBeInTheDocument()
    expect(getByLabelText(/^Password/)).toBeInTheDocument()
  })
})
