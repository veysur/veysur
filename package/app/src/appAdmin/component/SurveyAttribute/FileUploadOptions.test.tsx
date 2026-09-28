// cspell:ignore msword wordprocessingml spreadsheetml presentationml
import { render, fireEvent, screen } from '@testing-library/react'
import { FileUploadOptions as FileUploadOptionsValue } from 'veysur-common'

import { FileUploadOptions } from './FileUploadOptions'
import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const PDF_MIME_TYPES = ['application/pdf']
const ALL_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...PDF_MIME_TYPES,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

const EMPTY_VALUE: FileUploadOptionsValue = {
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ALL_MIME_TYPES,
  maxFileCount: 1,
}

function buildConfig(
  overrides: Partial<{ name: string; initialValue: unknown }> = {},
): AttributeConfig {
  return {
    name: overrides.name ?? 'File upload options',
    initialValue: overrides.initialValue,
  } as unknown as AttributeConfig
}

describe('FileUploadOptions', () => {
  it('renders size (MB) and count inputs and the five mime-type-group checkboxes', () => {
    render(
      <FileUploadOptions
        entity={{} as never}
        config={buildConfig()}
        onChange={jest.fn()}
        isValid={true}
        value={{
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: IMAGE_MIME_TYPES,
          maxFileCount: 3,
        }}
      />,
    )

    const [sizeInput, countInput] = screen.getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]
    expect(sizeInput.value).toBe('5')
    expect(countInput.value).toBe('3')

    const groupLabels = ['Images', 'PDF', 'Word', 'Excel', 'PowerPoint']
    for (const label of groupLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('checkbox')).toHaveLength(groupLabels.length)
  })

  it('toggling a group adds/removes its mime types from allowedMimeTypes with a full value object', () => {
    const onChange = jest.fn()
    render(
      <FileUploadOptions
        entity={{} as never}
        config={buildConfig()}
        onChange={onChange}
        isValid={true}
        value={{
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: IMAGE_MIME_TYPES,
          maxFileCount: 3,
        }}
      />,
    )

    // Group order matches FILE_TYPE_GROUPS: Images, PDF, Word, Excel, PowerPoint
    const [imagesCheckbox, pdfCheckbox] = screen.getAllByRole('checkbox')

    fireEvent.click(pdfCheckbox)
    expect(onChange).toHaveBeenCalledWith({
      maxFileSize: 5 * 1024 * 1024,
      allowedMimeTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
      maxFileCount: 3,
    })

    fireEvent.click(imagesCheckbox)
    expect(onChange).toHaveBeenLastCalledWith({
      maxFileSize: 5 * 1024 * 1024,
      allowedMimeTypes: PDF_MIME_TYPES,
      maxFileCount: 3,
    })
  })

  it('falls back to EMPTY_VALUE when no value or config.initialValue is set', () => {
    render(
      <FileUploadOptions
        entity={{} as never}
        config={buildConfig()}
        onChange={jest.fn()}
        isValid={true}
        value={undefined}
      />,
    )

    const [sizeInput, countInput] = screen.getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]
    expect(sizeInput.value).toBe(
      String(EMPTY_VALUE.maxFileSize / (1024 * 1024)),
    )
    expect(countInput.value).toBe(String(EMPTY_VALUE.maxFileCount))
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toHaveAttribute('aria-checked', 'true')
    }
  })

  it('falls back to config.initialValue when no value is set', () => {
    const initialValue: FileUploadOptionsValue = {
      maxFileSize: 2 * 1024 * 1024,
      allowedMimeTypes: PDF_MIME_TYPES,
      maxFileCount: 7,
    }
    render(
      <FileUploadOptions
        entity={{} as never}
        config={buildConfig({ initialValue })}
        onChange={jest.fn()}
        isValid={true}
        value={undefined}
      />,
    )

    const [sizeInput, countInput] = screen.getAllByRole(
      'spinbutton',
    ) as HTMLInputElement[]
    expect(sizeInput.value).toBe('2')
    expect(countInput.value).toBe('7')
  })

  it('renders field errors from errors keyed by ${config.name}.<field>', () => {
    render(
      <FileUploadOptions
        entity={{} as never}
        config={buildConfig({ name: 'File upload options' })}
        onChange={jest.fn()}
        isValid={false}
        errors={{
          'File upload options.maxFileSize': ['Max file size is too large'],
          'File upload options.maxFileCount': ['Max file count is too large'],
          'File upload options.allowedMimeTypes': [
            'At least one file type is required',
          ],
        }}
        value={{
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: IMAGE_MIME_TYPES,
          maxFileCount: 3,
        }}
      />,
    )

    expect(screen.getByText('Max file size is too large')).toBeInTheDocument()
    expect(screen.getByText('Max file count is too large')).toBeInTheDocument()
    expect(
      screen.getByText('At least one file type is required'),
    ).toBeInTheDocument()
  })
})
