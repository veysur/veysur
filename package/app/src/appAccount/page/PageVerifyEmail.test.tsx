import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PageVerifyEmail } from './PageVerifyEmail'
import { Registry, KEY_REGISTRY_EMAIL_VERIFIED_HANDLER } from 'common'

const postMock = jest.fn()
const authRefreshMock = jest.fn()
const showFlashMessageMock = jest.fn()
let authValue: { user: { email: string } } | undefined

jest.mock('registry', () => ({
  getRestClient: () => ({ post: postMock }),
}))
jest.mock('hook/useAuth', () => ({
  useAuth: () => ({ auth: authValue, authRefresh: authRefreshMock }),
}))
jest.mock('hook', () => ({ usePageTitle: jest.fn() }))
jest.mock('component/FlashMessage', () => ({
  useFlashMessage: () => ({ showFlashMessage: showFlashMessageMock }),
}))
jest.mock('appAccount/component/Layout', () => ({
  AccountPageLayout: ({ children }: { children: React.ReactNode }) => children,
}))

const renderPage = () => {
  // The page reads the query string from window.location, not the router
  window.history.pushState({}, '', '/verify-email?email=a@b.test&token=123456')
  return render(
    <MemoryRouter
      initialEntries={['/verify-email?email=a@b.test&token=123456']}
    >
      <Routes>
        <Route path="/verify-email" element={<PageVerifyEmail />} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PageVerifyEmail', () => {
  const handler = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    postMock.mockResolvedValue({})
    Registry.getInstance().set(KEY_REGISTRY_EMAIL_VERIFIED_HANDLER, handler)
  })

  afterEach(() => {
    Registry.getInstance().set(KEY_REGISTRY_EMAIL_VERIFIED_HANDLER, null)
  })

  it('moves an authenticated user on without a Continue click', async () => {
    authValue = { user: { email: 'a@b.test' } }
    authRefreshMock.mockResolvedValue({ user: authValue.user })

    renderPage()

    expect(await screen.findByText('home')).toBeTruthy()
    expect(screen.queryByText('Continue')).toBeNull()
    expect(showFlashMessageMock).toHaveBeenCalledWith(
      'success',
      'Email verified',
    )
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('keeps the success screen with a login button when not signed in', async () => {
    authValue = undefined
    authRefreshMock.mockResolvedValue(undefined)

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Email Verified!')).toBeTruthy(),
    )
    expect(screen.getByText('Continue')).toBeTruthy()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
