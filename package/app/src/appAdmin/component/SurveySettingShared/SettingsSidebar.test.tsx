import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { SidebarProvider } from 'component/shadcn/sidebar'

import { SettingsSidebar } from './SettingsSidebar'

describe('SettingsSidebar', () => {
  beforeAll(() => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))
  })

  it('lists maps and bot protection, which a survey can override', () => {
    render(
      <SidebarProvider>
        <SettingsSidebar activeSection="language" onSectionChange={jest.fn()} />
      </SidebarProvider>,
    )

    expect(screen.getByText('Maps')).toBeInTheDocument()
    expect(screen.getByText('Bot protection')).toBeInTheDocument()
  })
})
