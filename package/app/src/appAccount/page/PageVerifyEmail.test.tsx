import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PageVerifyEmail } from './PageVerifyEmail'
import { queryClient } from 'common/queryClient'
import {
  KEY_STATE_REMEMBER_ME,
  KEY_STATE_SIGNUP_REMEMBER_PENDING,
} from 'common/keyState'
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

  describe('signup remember-me pending flag', () => {
    beforeEach(() => {
      authValue = { user: { email: 'a@b.test' } }
      authRefreshMock.mockResolvedValue({ user: authValue.user })
      queryClient.setQueryData([KEY_STATE_REMEMBER_ME], true)
    })

    afterEach(() => {
      queryClient.removeQueries({ queryKey: [KEY_STATE_REMEMBER_ME] })
      queryClient.removeQueries({
        queryKey: [KEY_STATE_SIGNUP_REMEMBER_PENDING],
      })
    })

    it('applies a false pending value and removes the flag', async () => {
      queryClient.setQueryData([KEY_STATE_SIGNUP_REMEMBER_PENDING], false)
      renderPage()
      await screen.findByText('home')
      expect(queryClient.getQueryData([KEY_STATE_REMEMBER_ME])).toBe(false)
      expect(
        queryClient.getQueryData([KEY_STATE_SIGNUP_REMEMBER_PENDING]),
      ).toBeUndefined()
    })

    it('keeps remember-me when the pending value is true', async () => {
      queryClient.setQueryData([KEY_STATE_SIGNUP_REMEMBER_PENDING], true)
      renderPage()
      await screen.findByText('home')
      expect(queryClient.getQueryData([KEY_STATE_REMEMBER_ME])).toBe(true)
    })

    it('changes nothing without the flag', async () => {
      renderPage()
      await screen.findByText('home')
      expect(queryClient.getQueryData([KEY_STATE_REMEMBER_ME])).toBe(true)
    })
  })
})
