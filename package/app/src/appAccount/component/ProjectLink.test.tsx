import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ProjectLink } from './ProjectLink'
import { useAuth } from 'hook/useAuth'

jest.mock('hook/useAuth', () => ({
  ...jest.requireActual('hook/useAuth'),
  useAuth: jest.fn(),
}))

const mockUseAuth = useAuth as jest.Mock

const renderWithAuth = (
  auth: unknown,
  props: { projectId: string; projectName?: string | null },
  fallback?: React.ReactNode,
) => {
  mockUseAuth.mockReturnValue({ auth })
  return render(
    <MemoryRouter>
      <ProjectLink {...props} fallback={fallback} />
    </MemoryRouter>,
  )
}

describe('ProjectLink', () => {
  test('links to the manage page when the project is owned', () => {
    renderWithAuth(
      { user: { projectOwn: [{ _id: 'proj_1' }] } },
      { projectId: 'proj_1', projectName: 'Project One' },
    )

    const link = screen.getByRole('link', { name: 'Project One' })
    expect(link).toHaveAttribute('href', '/project/proj_1/manage')
  })

  test('renders plain text when the project is not owned', () => {
    renderWithAuth(
      { user: { projectOwn: [] } },
      { projectId: 'proj_1', projectName: 'Project One' },
    )

    expect(screen.getByText('Project One')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('renders fallback when there is no project name', () => {
    renderWithAuth(
      { user: { projectOwn: [] } },
      { projectId: 'proj_1', projectName: null },
      <span>none</span>,
    )

    expect(screen.getByText('none')).toBeInTheDocument()
  })
})
