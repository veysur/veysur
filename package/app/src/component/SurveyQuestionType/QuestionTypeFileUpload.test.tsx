import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react'
import { SurveyQuestion, QUESTION_TYPE_FILE_UPLOAD } from 'veysur-common'

import { QuestionTypeFileUpload } from './QuestionTypeFileUpload'

jest.mock('registry', () => ({
  getRestClient: jest.fn(() => ({})),
}))

jest.mock('common/uploadFile', () => ({
  ...jest.requireActual('common/uploadFile'),
  uploadSurveyParticipantFile: jest.fn(),
}))

import { uploadSurveyParticipantFile } from 'common/uploadFile'

const mockUploadSurveyParticipantFile =
  uploadSurveyParticipantFile as jest.MockedFunction<
    typeof uploadSurveyParticipantFile
  >

function buildQuestion(): SurveyQuestion {
  return {
    _id: 'q1',
    code: 'Q1',
    type: QUESTION_TYPE_FILE_UPLOAD,
    attributes: {
      fileUploadOptions: {
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/png'],
        maxFileCount: 1,
      },
    },
  } as unknown as SurveyQuestion
}

async function selectFile() {
  const file = new File(['contents'], 'photo.png', { type: 'image/png' })
  const fileInput =
    document.querySelector<HTMLInputElement>('input[type="file"]')!
  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [file] } })
  })
}

describe('QuestionTypeFileUpload', () => {
  beforeEach(() => {
    mockUploadSurveyParticipantFile.mockReset()
  })

  it('awaits ensureResponseStarted before uploading, so a response row exists first', async () => {
    const callOrder: string[] = []
    const ensureResponseStarted = jest.fn(async () => {
      callOrder.push('ensureResponseStarted')
    })
    mockUploadSurveyParticipantFile.mockImplementation(async () => {
      callOrder.push('upload')
      return { fileId: 'file-1' }
    })
    const onChange = jest.fn()

    render(
      <QuestionTypeFileUpload
        question={buildQuestion()}
        value={undefined}
        lang="en"
        langDefault="en"
        authToken="jwt-token"
        onChange={onChange}
        ensureResponseStarted={ensureResponseStarted}
      />,
    )

    await selectFile()

    await waitFor(() => expect(onChange).toHaveBeenCalled())

    expect(callOrder).toEqual(['ensureResponseStarted', 'upload'])
    expect(onChange).toHaveBeenCalledWith({ fileIds: ['file-1'] })
  })

  it('uploads normally when ensureResponseStarted is not provided (a response already exists)', async () => {
    mockUploadSurveyParticipantFile.mockResolvedValue({ fileId: 'file-1' })
    const onChange = jest.fn()

    render(
      <QuestionTypeFileUpload
        question={buildQuestion()}
        value={undefined}
        lang="en"
        langDefault="en"
        authToken="jwt-token"
        onChange={onChange}
      />,
    )

    await selectFile()

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({
      fileIds: ['file-1'],
    }))
  })

  it('shows an upload error and skips the upload call if ensureResponseStarted fails', async () => {
    const ensureResponseStarted = jest.fn(async () => {
      throw new Error('save failed')
    })
    const onChange = jest.fn()

    render(
      <QuestionTypeFileUpload
        question={buildQuestion()}
        value={undefined}
        lang="en"
        langDefault="en"
        authToken="jwt-token"
        onChange={onChange}
        ensureResponseStarted={ensureResponseStarted}
      />,
    )

    await selectFile()

    await waitFor(() =>
      expect(
        screen.getByText('File upload failed. Please try again.'),
      ).toBeInTheDocument(),
    )
    expect(mockUploadSurveyParticipantFile).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })
})
