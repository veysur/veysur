import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import { FileUploadAnswerSummary } from './FileUploadAnswerSummary'

describe('FileUploadAnswerSummary', () => {
  it('shows "No answer" when there are no uploaded files', () => {
    render(<FileUploadAnswerSummary answerValue={null} />)
    expect(screen.getByText('No answer')).toBeInTheDocument()
  })

  it('shows "File unavailable" when the file metadata was not supplied', () => {
    render(
      <FileUploadAnswerSummary answerValue={{ fileIds: ['file_1'] }} files={[]} />,
    )
    expect(screen.getByText('File unavailable')).toBeInTheDocument()
  })

  it('renders a clickable download button that calls onDownload with the fileId', () => {
    const onDownload = jest.fn()
    render(
      <FileUploadAnswerSummary
        answerValue={{ fileIds: ['file_1'] }}
        files={[{ _id: 'file_1', filename: 'resume.pdf' }]}
        onDownload={onDownload}
      />,
    )

    const button = screen.getByRole('button', { name: 'resume.pdf' })
    fireEvent.click(button)

    expect(onDownload).toHaveBeenCalledWith('file_1')
  })

  it('renders the filename as plain text (no link) when onDownload is not supplied', () => {
    render(
      <FileUploadAnswerSummary
        answerValue={{ fileIds: ['file_1'] }}
        files={[{ _id: 'file_1', filename: 'resume.pdf' }]}
      />,
    )

    expect(screen.getByText('resume.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
