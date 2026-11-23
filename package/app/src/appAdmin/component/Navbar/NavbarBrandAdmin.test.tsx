import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { NavbarBrandAdmin } from './NavbarBrandAdmin'

const mockUseAuth = jest.fn()

jest.mock('appAdmin/hook', () => ({
  useAuth: () => mockUseAuth(),
  useProjectDomain: () => ({ _id: 'p1' }),
}))
jest.mock('registry', () => ({
  getAdminNavbarExtra: () => null,
  getProjectSwitcher: () => null,
}))
jest.mock('appAdmin/component/DataTransferNotification', () => ({
  DataTransferNotificationBell: () => null,
}))
jest.mock('component/ModeToggle', () => ({ ModeToggle: () => null }))

function renderNavbar(isOwner: boolean) {
  mockUseAuth.mockReturnValue({
    auth: { user: { projectOwn: isOwner ? [{ _id: 'p1' }] : [] } },
    authRefresh: jest.fn(),
  })
  render(
    <MemoryRouter>
      <NavbarBrandAdmin />
    </MemoryRouter>,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: 'Menu' }), {
    key: 'Enter',
  })
}

describe('NavbarBrandAdmin mobile menu', () => {
  it('lists every section for a project owner', () => {
    renderNavbar(true)

    for (const name of [
      'Surveys',
      'Team',
      'Survey settings',
      'Project settings',
    ]) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument()
    }
  })

  it('omits owner-only entries for other users', () => {
    renderNavbar(false)

    expect(
      screen.getByRole('menuitem', { name: 'Surveys' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Team' })).toBeNull()
    expect(
      screen.queryByRole('menuitem', { name: 'Project settings' }),
    ).toBeNull()
  })
})
