import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SurveyPublication } from 'veysur-common'

import { PublicationRowAction } from './PublicationRowAction'

jest.mock('./hook', () => ({
  usePublicationDelete: () => ({ publicationDelete: jest.fn() }),
  useExportSurveyResponse: () => ({
    exportResponses: jest.fn(),
    isExporting: false,
  }),
  useExportSurveyPublication: () => ({
    exportPublication: jest.fn(),
    isExporting: false,
  }),
}))

// The dropdown-open mechanics of ActionMenu/DropdownMenuItem (Radix Menu)
// aren't what this test targets - render children unconditionally, outside
// any Radix Menu context, so the conditional dialog copy below can be
// asserted directly.
jest.mock('component/ActionMenu', () => ({
  ActionMenu: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}))

jest.mock('component/shadcn/dropdown-menu', () => ({
  DropdownMenuItem: (props: { children: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}))

jest.mock('component/DialogConfirmClickable', () => ({
  DialogConfirmClickable: (props: {
    title: string
    message: string
    children: React.ReactNode
  }) => (
    <div>
      <div data-testid="delete-dialog-title">{props.title}</div>
      <div data-testid="delete-dialog-message">{props.message}</div>
      {props.children}
    </div>
  ),
}))

const makePublication = (
  overrides: Partial<SurveyPublication> = {},
): SurveyPublication =>
  ({
    _id: 'publication-12345678',
    surveyId: 'survey-1',
    snapshotId: 'snapshot-1',
    label: null,
    notes: null,
    publishedAt: new Date(),
    stoppedAt: null,
    ...overrides,
  }) as SurveyPublication

const renderComponent = (publication: SurveyPublication) =>
  render(
    <MemoryRouter>
      <PublicationRowAction publication={publication} surveyId="survey-1" />
    </MemoryRouter>,
  )

describe('PublicationRowAction delete confirmation copy', () => {
  it('warns about unpublishing when the publication is currently active', () => {
    renderComponent(makePublication({ stoppedAt: null }))

    expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent(
      'Unpublish and Delete Publication',
    )
    expect(screen.getByTestId('delete-dialog-message')).toHaveTextContent(
      /currently published/i,
    )
    expect(screen.getByTestId('delete-dialog-message')).toHaveTextContent(
      /unpublish/i,
    )
  })

  it('uses the plain delete copy when the publication is already stopped', () => {
    renderComponent(makePublication({ stoppedAt: new Date() }))

    expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent(
      'Delete Publication',
    )
    expect(screen.getByTestId('delete-dialog-title')).not.toHaveTextContent(
      'Unpublish',
    )
    expect(screen.getByTestId('delete-dialog-message')).not.toHaveTextContent(
      /currently published/i,
    )
  })
})
