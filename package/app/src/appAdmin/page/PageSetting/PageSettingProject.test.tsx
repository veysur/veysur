import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PageSettingProject } from './PageSettingProject'

type MockProject = { _id: string; timezone: string }

let mockProject: MockProject | null | undefined
let mockProjectOwn: { _id: string }[] | undefined

jest.mock('hook', () => ({ usePageTitle: jest.fn() }))

jest.mock('component/FlashMessage', () => ({
  useFlashMessage: () => ({ showFlashMessage: jest.fn() }),
}))

jest.mock('component/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

jest.mock('appAdmin/component/Layout', () => ({
  AdminPageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

jest.mock('appAdmin/hook', () => ({
  useAuth: () => ({ auth: { user: { projectOwn: mockProjectOwn } } }),
  useProjectDomain: () => mockProject,
}))

jest.mock('appAdmin/hook/useProjectTimezoneUpdate', () => ({
  useProjectTimezoneUpdate: () => ({
    updateTimezone: jest.fn(),
    isLoading: false,
    error: null,
  }),
}))

jest.mock('appAdmin/component/ProjectSetting/ProjectTimezoneForm', () => ({
  ProjectTimezoneForm: () => <div data-testid="timezone-form" />,
}))

jest.mock('appAdmin/component/ProjectSetting/ProjectSettingsTransfer', () => ({
  ProjectSettingsTransfer: () => <div data-testid="settings-transfer" />,
}))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/setting/project']}>
      <Routes>
        <Route path="/setting/project" element={<PageSettingProject />} />
        <Route path="/survey" element={<div data-testid="survey-list" />} />
      </Routes>
    </MemoryRouter>,
  )

describe('PageSettingProject', () => {
  beforeEach(() => {
    mockProject = { _id: 'p1', timezone: 'UTC' }
    mockProjectOwn = [{ _id: 'p1' }]
  })

  it('renders the settings for a project owner', () => {
    renderPage()

    expect(screen.getByTestId('timezone-form')).toBeInTheDocument()
  })

  it('does not redirect while the project is still resolving on a cold load', () => {
    mockProject = undefined

    renderPage()

    expect(screen.queryByTestId('survey-list')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timezone-form')).not.toBeInTheDocument()
  })

  it('redirects to the survey list when the user does not own the project', () => {
    mockProjectOwn = [{ _id: 'other' }]

    renderPage()

    expect(screen.getByTestId('survey-list')).toBeInTheDocument()
  })
})
