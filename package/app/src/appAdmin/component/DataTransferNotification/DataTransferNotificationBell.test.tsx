import React from 'react'
import { render, screen } from '@testing-library/react'

import { DataTransferNotificationBell } from './DataTransferNotificationBell'
import type { NotificationListItem } from './model/api/NotificationApi'

// The dropdown-open mechanics (Radix Menu) aren't what this test targets -
// render children unconditionally so the always-in-DOM list content can be
// asserted directly, per PublicationRowAction.test.tsx's convention.
jest.mock('component/shadcn/dropdown-menu', () => ({
  DropdownMenu: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
  DropdownMenuContent: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
  DropdownMenuTrigger: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
  DropdownMenuLabel: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
}))

const mockDismissNotification = jest.fn()

jest.mock('./hook/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    isLoading: false,
    refetch: jest.fn(),
  }),
}))

jest.mock('./hook/useDismissNotification', () => ({
  useDismissNotification: () => ({
    dismissNotification: mockDismissNotification,
    isDismissing: false,
  }),
}))

jest.mock('./hook/useMarkNotificationRead', () => ({
  useMarkNotificationRead: () => ({
    markRead: jest.fn(),
  }),
}))

let mockNotifications: NotificationListItem[] = []

const makeNotification = (
  overrides: Partial<NotificationListItem> = {},
): NotificationListItem => ({
  notificationId: 'n1',
  type: 'dataTransferJob',
  level: 'info',
  title: 'Import survey',
  message: null,
  status: 'read',
  dataTransferJobId: 'job-1',
  createdAt: '2026-09-25T00:00:00.000Z',
  ...overrides,
})

describe('DataTransferNotificationBell dismiss button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows the dismiss button for a completed job even when level has not moved off "info"', () => {
    mockNotifications = [
      makeNotification({ level: 'info', dataTransferJobStatus: 'completed' }),
    ]

    render(<DataTransferNotificationBell />)

    expect(
      screen.getByRole('button', { name: /dismiss notification/i }),
    ).toBeInTheDocument()
  })

  it('shows the dismiss button for a failed job even when level has not moved off "info"', () => {
    mockNotifications = [
      makeNotification({ level: 'info', dataTransferJobStatus: 'failed' }),
    ]

    render(<DataTransferNotificationBell />)

    expect(
      screen.getByRole('button', { name: /dismiss notification/i }),
    ).toBeInTheDocument()
  })

  it('hides the dismiss button while a job is still pending or processing', () => {
    mockNotifications = [
      makeNotification({ level: 'info', dataTransferJobStatus: 'processing' }),
    ]

    render(<DataTransferNotificationBell />)

    expect(
      screen.queryByRole('button', { name: /dismiss notification/i }),
    ).not.toBeInTheDocument()
  })
})
