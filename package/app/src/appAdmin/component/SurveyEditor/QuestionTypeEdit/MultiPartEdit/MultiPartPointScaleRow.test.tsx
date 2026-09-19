import type * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import type { L10n } from 'veysur-common'
import { QUESTION_TYPE_POINT_5 } from 'veysur-common'

import { MultiPartPointScaleRow } from './MultiPartPointScaleRow'

const handleDelete = jest.fn()
const handleFocus = jest.fn()
const handleTextChange = jest.fn()
const closeDialog = jest.fn()

const dialogState = {
  open: false,
  message: '',
  onConfirm: jest.fn(),
}

jest.mock('../shared/useSortableEntityRow', () => ({
  useSortableEntityRow: () => ({
    setNodeRef: jest.fn(),
    style: {},
    attributes: {},
    listeners: {},
    isFocused: false,
    handleFocus,
    label: 'Part label',
    labelForDialog: 'Part label',
    handleTextChange,
    handleDelete,
    handleMoveUp: undefined,
    handleMoveDown: undefined,
    dialogState,
    closeDialog,
  }),
}))

const labelL10n = { getLang: () => 'Part label' } as unknown as L10n

const baseProps = {
  entityId: 'p1',
  labelL10n,
  partType: QUESTION_TYPE_POINT_5,
  pointCount: 5,
  questionId: 'q1',
  lang: 'en',
  langDefault: 'en',
  langEditing: 'en',
  index: 0,
  totalCount: 3,
  onUpdateText: jest.fn(),
  onDelete: jest.fn(),
}

const renderRow = (
  extra: Partial<React.ComponentProps<typeof MultiPartPointScaleRow>> = {},
) =>
  render(
    <table>
      <tbody>
        <MultiPartPointScaleRow {...baseProps} {...extra} />
      </tbody>
    </table>,
  )

describe('MultiPartPointScaleRow', () => {
  beforeEach(() => {
    handleDelete.mockClear()
    dialogState.open = false
  })

  it('renders one MultiPartPointScaleCellPreview per point plus the row label', () => {
    renderRow()

    expect(screen.getByText('Part label')).toBeInTheDocument()
    // 5 points, non-star type: numbered circles 1..5
    for (let point = 1; point <= 5; point += 1) {
      expect(screen.getByText(String(point))).toBeInTheDocument()
    }
  })

  it('invokes onDelete via the shared confirm-dialog flow', () => {
    const { container } = renderRow()

    const deleteButton = container.querySelector('button.delete')
    expect(deleteButton).not.toBeNull()
    fireEvent.click(deleteButton as Element)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(handleDelete).toHaveBeenCalledTimes(1)
  })

  it('renders {{expression}} validation errors passed via the errors prop', () => {
    renderRow({ errors: ['a matrix sub-question, which has no single value'] })

    expect(
      screen.getByText('a matrix sub-question, which has no single value'),
    ).toBeInTheDocument()
  })
})
