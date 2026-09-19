import { render, screen, fireEvent } from '@testing-library/react'

import { AttributeRow } from './AttributeRow'
import { SurveyParticipantAttributeRow } from '../hook'

const systemRow: SurveyParticipantAttributeRow = {
  kind: 'system',
  name: 'email',
  required: true,
  internal: false,
  example: undefined,
  label: 'Email',
  description: undefined,
  languages: {},
}

const customRow: SurveyParticipantAttributeRow = {
  kind: 'custom',
  name: 'department',
  attribute: {
    name: 'department',
    required: false,
    internal: false,
    example: 'Sales',
  },
  required: false,
  internal: false,
  example: 'Sales',
  label: 'Department',
  description: 'Department of the participant',
  languages: {
    en: { label: 'Department', description: 'Department of the participant' },
  },
}

describe('AttributeRow', () => {
  const baseProps = {
    lang: 'en',
    langDefault: 'en',
    index: 0,
    totalCount: 1,
    onUpdateLanguage: jest.fn(),
    onUpdateField: jest.fn(),
    onDelete: jest.fn(),
    onRename: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders a system attribute as read-only', () => {
    render(<AttributeRow row={systemRow} {...baseProps} />)

    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByLabelText('Label')).toBeDisabled()
    expect(screen.getByLabelText('Required')).toBeDisabled()
  })

  it('renders a custom attribute as editable and saves label changes on blur', () => {
    render(<AttributeRow row={customRow} {...baseProps} />)

    expect(screen.getByDisplayValue('department')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()

    const labelInput = screen.getByLabelText('Label')
    expect(labelInput).not.toBeDisabled()

    fireEvent.change(labelInput, { target: { value: 'Department2' } })
    fireEvent.blur(labelInput)

    expect(baseProps.onUpdateLanguage).toHaveBeenCalledWith(
      'department',
      'en',
      expect.objectContaining({ label: 'Department2' }),
    )
  })

  it('calls onUpdateField when toggling required for a custom attribute', () => {
    render(<AttributeRow row={customRow} {...baseProps} />)

    fireEvent.click(screen.getByLabelText('Required'))

    expect(baseProps.onUpdateField).toHaveBeenCalledWith(
      'department',
      'required',
      true,
    )
  })

  it('reflects local required state immediately on toggle without waiting for save', () => {
    render(<AttributeRow row={customRow} {...baseProps} />)

    const checkbox = screen.getByLabelText('Required')
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)

    expect(checkbox).toBeChecked()
  })

  it('resets label and description when lang prop changes', () => {
    const rowWithLangs: SurveyParticipantAttributeRow = {
      ...customRow,
      languages: {
        en: { label: 'Department', description: 'Department en' },
        fr: { label: 'Department fr', description: 'Department fr' },
      },
    }

    const { rerender } = render(
      <AttributeRow row={rowWithLangs} {...baseProps} lang="en" />,
    )

    expect(screen.getByLabelText('Label')).toHaveValue('Department')

    rerender(<AttributeRow row={rowWithLangs} {...baseProps} lang="fr" />)

    expect(screen.getByLabelText('Label')).toHaveValue('Department fr')
  })

  it('stages a rename as the user types, without a per-row dialog', () => {
    render(<AttributeRow row={customRow} {...baseProps} />)

    const nameInput = screen.getByDisplayValue('department')
    fireEvent.change(nameInput, { target: { value: 'region' } })

    expect(screen.queryByText('Rename attribute')).not.toBeInTheDocument()
    expect(baseProps.onRename).toHaveBeenCalledWith('department', 'region')
  })

  it('un-stages the rename when the name is edited back to the original', () => {
    render(<AttributeRow row={customRow} {...baseProps} />)

    const nameInput = screen.getByDisplayValue('department')
    fireEvent.change(nameInput, { target: { value: 'region' } })
    fireEvent.change(nameInput, { target: { value: 'department' } })

    expect(baseProps.onRename).toHaveBeenLastCalledWith(
      'department',
      'department',
    )
  })

  it('does not stage a rename on blur when the name is unchanged', () => {
    render(<AttributeRow row={customRow} {...baseProps} />)

    const nameInput = screen.getByDisplayValue('department')
    fireEvent.blur(nameInput)

    expect(baseProps.onRename).not.toHaveBeenCalled()
  })

  it('calls onRename with tempId (not name) when a local row name is entered', () => {
    const localRow: SurveyParticipantAttributeRow = {
      kind: 'custom',
      name: '',
      tempId: 'tmp-abc-123',
      required: false,
      internal: false,
      example: null,
      label: '',
      description: '',
      languages: {},
    }

    render(<AttributeRow row={localRow} {...baseProps} isLocal />)

    const nameInput = screen.getByPlaceholderText('Attribute name')
    fireEvent.change(nameInput, { target: { value: 'region' } })
    fireEvent.blur(nameInput)

    expect(baseProps.onRename).toHaveBeenCalledWith('tmp-abc-123', 'region')
  })

  it('shows an error border and does not call onRename when a local row name is blurred empty', () => {
    const localRow: SurveyParticipantAttributeRow = {
      kind: 'custom',
      name: '',
      tempId: 'tmp-abc-123',
      required: false,
      internal: false,
      example: null,
      label: '',
      description: '',
      languages: {},
    }

    render(<AttributeRow row={localRow} {...baseProps} isLocal />)

    const nameInput = screen.getByPlaceholderText('Attribute name')
    fireEvent.blur(nameInput)

    expect(baseProps.onRename).not.toHaveBeenCalled()
    expect(nameInput).toHaveClass('border-destructive')
  })

  it('shows an inline error and does not call onRename when a local row name contains a space', () => {
    const localRow: SurveyParticipantAttributeRow = {
      kind: 'custom',
      name: '',
      tempId: 'tmp-abc-123',
      required: false,
      internal: false,
      example: null,
      label: '',
      description: '',
      languages: {},
    }

    render(<AttributeRow row={localRow} {...baseProps} isLocal />)

    const nameInput = screen.getByPlaceholderText('Attribute name')
    fireEvent.change(nameInput, { target: { value: 'first name' } })
    fireEvent.blur(nameInput)

    expect(baseProps.onRename).not.toHaveBeenCalled()
    expect(nameInput).toHaveClass('border-destructive')
    expect(
      screen.getByText(
        'Name must start with a letter or underscore, and contain only letters, numbers and underscores',
      ),
    ).toBeInTheDocument()
  })

  it('does not stage a rename when an existing row name is changed to an invalid value', () => {
    render(<AttributeRow row={customRow} {...baseProps} />)

    const nameInput = screen.getByDisplayValue('department')
    fireEvent.change(nameInput, { target: { value: 'region code' } })
    fireEvent.blur(nameInput)

    expect(baseProps.onRename).not.toHaveBeenCalledWith(
      'department',
      'region code',
    )
    expect(nameInput).toHaveClass('border-destructive')
  })
})
