import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ProjectBotProtectionSection } from './ProjectBotProtectionSection'
import { ProjectMapsSection } from './ProjectMapsSection'

const mockUseSettingProject = jest.fn()

jest.mock('appAdmin/hook/useSettingProject', () => ({
  useSettingProject: () => mockUseSettingProject(),
}))

jest.mock('appAdmin/hook/useProjectMapsKeyUpdate', () => ({
  useProjectMapsKeyUpdate: () => ({
    updateGoogleApiKey: jest.fn(),
    isLoading: false,
    error: null,
  }),
}))

jest.mock('appAdmin/hook/useProjectBotProtectionUpdate', () => ({
  useProjectBotProtectionUpdate: () => ({
    updateBotProtection: jest.fn(),
    isLoading: false,
    error: null,
  }),
}))

jest.mock('component/FlashMessage', () => ({
  useFlashMessage: () => ({ showFlashMessage: jest.fn() }),
}))

jest.mock('./ProjectMapsForm', () => ({
  ProjectMapsForm: ({ googleApiKey }: { googleApiKey: string }) => (
    <div data-testid="maps-form">{googleApiKey}</div>
  ),
}))

jest.mock('./ProjectBotProtectionForm', () => ({
  ProjectBotProtectionForm: ({
    stored,
  }: {
    stored?: { provider?: string }
  }) => <div data-testid="bot-form">{stored?.provider}</div>,
}))

describe('project setting sections', () => {
  it('render nothing until the project settings load', () => {
    mockUseSettingProject.mockReturnValue({ settingProject: undefined })

    const { container } = render(
      <>
        <ProjectMapsSection projectId="proj_1" />
        <ProjectBotProtectionSection projectId="proj_1" />
      </>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('show the stored project keys', () => {
    mockUseSettingProject.mockReturnValue({
      settingProject: {
        _id: 's1',
        maps: { googleApiKey: 'maps-key' },
        botProtection: { provider: 'cloudflare' },
      },
    })

    render(
      <>
        <ProjectMapsSection projectId="proj_1" />
        <ProjectBotProtectionSection projectId="proj_1" />
      </>,
    )

    expect(screen.getByTestId('maps-form')).toHaveTextContent('maps-key')
    expect(screen.getByTestId('bot-form')).toHaveTextContent('cloudflare')
  })
})
