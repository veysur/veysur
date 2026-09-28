import { File as FileModel } from 'veysur-common'

import { Api } from 'model/api/Api'
import { ErrorRest } from 'model/api/ErrorRest'
import {
  calculateFileHash,
  uploadFile,
  uploadFileToS3,
  UploadProgress,
  UploadResult,
} from 'common/uploadFile'

export interface FileListResponse {
  files: FileModel[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export type ResponseFile = FileModel

export interface ResponseFileListResponse {
  files: ResponseFile[]
  pagination: FileListResponse['pagination']
}

export interface FileSoftDeleteResult {
  success: boolean
  file: FileModel
  alreadyDeleted?: boolean
  softDeleted?: boolean
}

export class FileApi extends Api {
  /**
   * Upload file with authentication and project context
   * Delegates to common uploadFile() function with authenticated client
   * Supports survey-specific and response-specific file uploads
   */
  async upload(
    projectId: string,
    jwtToken: string,
    file: File,
    options?: {
      surveyId?: string
      responseId?: string
      fileContext?: 'project' | 'survey' | 'response'
      onProgress?: (progress: UploadProgress) => void
    },
  ): Promise<UploadResult> {
    try {
      // Create authenticated RestClient with project and auth headers
      const client = this.getClient()

      // Set default headers for this upload operation
      client.setDefaultHeaders({
        'X-Project-Id': projectId,
        Authorization: `Bearer ${jwtToken}`,
      })

      // Delegate to common uploadFile function with options
      const result = await uploadFile(client, projectId, file, options)

      // Clear auth headers after upload
      client.setDefaultHeaders({
        'X-Project-Id': '',
        Authorization: '',
      })

      return result
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /**
   * Upload a single image set variant (original, edited, or thumb) to a predetermined path.
   * All blobs must be JPEG. Returns the filePath stored on the answer option.
   */
  async uploadImageSetVariant(
    projectId: string,
    jwtToken: string,
    imageSetId: string,
    variant: 'original' | 'edited' | 'thumb',
    blob: Blob,
    options?: {
      surveyId?: string
      responseId?: string
      fileContext?: 'project' | 'survey' | 'response'
      onProgress?: (progress: UploadProgress) => void
    },
  ): Promise<{ filePath: string; fileId: string; existingFile: boolean }> {
    try {
      const filename = `${variant}.jpg`
      const fileHash =
        variant === 'edited'
          ? await calculateFileHash(
              new File([blob], filename, { type: 'image/jpeg' }),
            )
          : ''
      const result = await this.getClient().post<{
        fileId: string
        uploadUrl: string
        existingFile: boolean
        filePath: string
      }>(
        '/file/upload-url',
        {
          imageSetId,
          imageVariant: variant,
          filename,
          fileHash,
          fileSize: blob.size,
          mimeType: 'image/jpeg',
          surveyId: options?.surveyId,
          responseId: options?.responseId,
          fileContext: options?.fileContext || 'survey',
        },
        {
          headers: {
            'X-Project-Id': projectId,
            Authorization: `Bearer ${jwtToken}`,
          },
        },
      )

      if (result.uploadUrl) {
        await uploadFileToS3(
          result.uploadUrl,
          new File([blob], filename, { type: 'image/jpeg' }),
          options?.onProgress,
        )
      }

      return {
        filePath: result.filePath,
        fileId: result.fileId,
        existingFile: result.existingFile,
      }
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /**
   * List files uploaded by a participant for a single response (fileUpload
   * question answers). Use `getDownloadUrl` to fetch a presigned download URL
   * on demand rather than a resolved URL per file.
   */
  async getFilesForResponse(
    projectId: string,
    jwtToken: string,
    surveyId: string,
    responseId: string,
  ): Promise<ResponseFileListResponse> {
    try {
      return await this.getClient().get<ResponseFileListResponse>(
        `/file/survey/${surveyId}/response/${responseId}`,
        {
          headers: {
            'X-Project-Id': projectId,
            Authorization: `Bearer ${jwtToken}`,
          },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /**
   * Generate a short-lived presigned download URL for a file, on demand -
   * call this when the user clicks a download link, not once per render.
   */
  async getDownloadUrl(
    projectId: string,
    jwtToken: string,
    fileId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    try {
      return await this.getClient().get<{
        downloadUrl: string
        expiresAt: string
      }>(`/file/${fileId}/download-url`, {
        headers: {
          'X-Project-Id': projectId,
          Authorization: `Bearer ${jwtToken}`,
        },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /**
   * Delete all S3 objects for an image set
   */
  async deleteImageSet(
    projectId: string,
    jwtToken: string,
    imageSetId: string,
    context: {
      surveyId?: string
      responseId?: string
      fileContext?: string
    },
  ): Promise<void> {
    try {
      await this.getClient().delete('/file/image-set', {
        headers: {
          'X-Project-Id': projectId,
          Authorization: `Bearer ${jwtToken}`,
        },
        data: { imageSetId, ...context },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /**
   * Get file metadata
   */
  async getOne(
    projectId: string,
    jwtToken: string,
    fileId: string,
  ): Promise<FileModel> {
    try {
      return await this.getClient().get<FileModel>(`/file/${fileId}`, {
        headers: {
          'X-Project-Id': projectId,
          Authorization: `Bearer ${jwtToken}`,
        },
      })
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /**
   * List files
   */
  async getAll(
    projectId: string,
    jwtToken: string,
    page: number = 1,
    perPage: number = 50,
  ): Promise<FileListResponse> {
    try {
      return await this.getClient().get<FileListResponse>(
        `/file?page=${page}&perPage=${perPage}`,
        {
          headers: {
            'X-Project-Id': projectId,
            Authorization: `Bearer ${jwtToken}`,
          },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }

  /**
   * Delete file
   */
  async delete(
    projectId: string,
    jwtToken: string,
    fileId: string,
  ): Promise<FileSoftDeleteResult> {
    try {
      return await this.getClient().delete<FileSoftDeleteResult>(
        `/file/${fileId}`,
        {
          headers: {
            'X-Project-Id': projectId,
            Authorization: `Bearer ${jwtToken}`,
          },
        },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}

export default FileApi
