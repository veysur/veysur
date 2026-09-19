import CryptoJS from 'crypto-js'
import { RestClient } from './RestClient'

export interface UploadResult {
  fileId: string
  uploadUrl: string | null
  existingFile: boolean
  file: {
    _id: string
    projectId: string
    filename: string
    storedFilename: string
    hash: string
    size: number
    mimeType: string
    filePath: string
    createdById: string
    surveyId?: string | null
    responseId?: string | null
    fileContext?: 'project' | 'survey' | 'response' | null
    bucketType?: 'public' | 'private'
    createdAt?: Date
    updatedAt?: Date
    uploaded?: Date
  }
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadOptions {
  surveyId?: string
  responseId?: string
  fileContext?: 'project' | 'survey' | 'response'
  onProgress?: (progress: UploadProgress) => void
}

/**
 * Calculate SHA256 hash of a file
 * @param file - File object to hash
 * @returns Promise resolving to hex string hash
 */
export async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
        const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex)
        resolve(hash)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file for hashing'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Upload file to S3 using presigned URL
 * @param presignedUrl - Presigned PUT URL from server
 * @param file - File object to upload
 * @param onProgress - Optional progress callback (percentage 0-100)
 * @returns Promise resolving when upload completes
 */
export async function uploadFileToS3(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        }
        onProgress(progress)
      }
    })

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(
          new Error(
            `S3 upload failed with status ${xhr.status}: ${xhr.statusText}`,
          ),
        )
      }
    })

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during S3 upload'))
    })

    // Handle upload abort
    xhr.addEventListener('abort', () => {
      reject(new Error('S3 upload aborted'))
    })

    // Open and send request
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Complete file upload workflow
 * 1. Calculate file hash
 * 2. Request presigned URL from API
 * 3. If file exists (deduplication), return existing file
 * 4. If new file, upload to S3 using presigned URL
 * 5. Return file metadata
 *
 * @param apiClient - RestClient instance with authentication
 * @param projectId - Project ID for file isolation
 * @param file - File object to upload
 * @param options - Upload options (surveyId, responseId, fileContext, onProgress)
 * @returns Promise resolving to upload result with file metadata
 */
export async function uploadFile(
  apiClient: RestClient,
  projectId: string,
  file: File,
  options?: UploadOptions | ((progress: UploadProgress) => void),
): Promise<UploadResult> {
  // Handle backward compatibility - if options is a function, treat it as onProgress
  let uploadOptions: UploadOptions = {}
  if (typeof options === 'function') {
    uploadOptions = { onProgress: options }
  } else if (options) {
    uploadOptions = options
  }

  const { surveyId, responseId, fileContext, onProgress } = uploadOptions

  // Step 1: Calculate file hash
  const fileHash = await calculateFileHash(file)

  // Step 2: Request presigned URL from API
  const requestBody: {
    filename: string
    fileHash: string
    fileSize: number
    mimeType: string
    surveyId?: string
    responseId?: string
    fileContext?: 'project' | 'survey' | 'response'
  } = {
    filename: file.name,
    fileHash,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  }

  // Add survey-specific fields if provided
  if (surveyId) requestBody.surveyId = surveyId
  if (responseId) requestBody.responseId = responseId
  if (fileContext) requestBody.fileContext = fileContext

  const uploadResult = await apiClient.post<UploadResult>(
    '/file/upload-url',
    requestBody,
    {
      headers: {
        'X-Project-Id': projectId,
      },
    },
  )

  // Step 3: Check if file already exists (deduplication)
  if (uploadResult.existingFile || !uploadResult.uploadUrl) {
    // File with same hash already exists, no upload needed
    return uploadResult
  }

  // Step 4: Upload file to S3 using presigned URL
  await uploadFileToS3(uploadResult.uploadUrl, file, onProgress)

  // Step 5: Confirm upload with server
  try {
    const confirmResult = await apiClient.post<{
      success: boolean
      file: UploadResult['file']
      alreadyConfirmed: boolean
    }>(
      `/file/${uploadResult.fileId}/confirm`,
      {},
      {
        headers: {
          'X-Project-Id': projectId,
        },
      },
    )

    // Update the upload result with confirmed file metadata
    if (confirmResult.file) {
      uploadResult.file = confirmResult.file
    }
  } catch (error) {
    // Log confirmation error but don't fail the whole upload
    // The file is already in S3, can be confirmed later via cleanup job
    console.error('Failed to confirm upload:', error)
    // Note: Could throw here to force retry if desired
  }

  // Step 6: Return file metadata
  return uploadResult
}

export interface PlatformUploadResult {
  fileId: string
  uploadUrl: string
}

/**
 * Upload a platform-scoped file (e.g. support ticket attachment)
 * 1. Calculate file hash
 * 2. Request presigned URL from API (no project context)
 * 3. Upload file to S3 using presigned URL
 * 4. Confirm upload with server
 *
 * @param apiClient - RestClient instance with authentication
 * @param file - File object to upload
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to the new file's ID
 */
export async function uploadPlatformFile(
  apiClient: RestClient,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  const fileHash = await calculateFileHash(file)

  const uploadResult = await apiClient.post<PlatformUploadResult>(
    '/support-ticket/file/upload-url',
    {
      filename: file.name,
      fileHash,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    },
  )

  await uploadFileToS3(uploadResult.uploadUrl, file, onProgress)

  await apiClient.post(
    `/support-ticket/file/${uploadResult.fileId}/confirm`,
    {},
  )

  return uploadResult.fileId
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Validate file size against limit
 * @param file - File to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns Error message if validation fails, null otherwise
 */
export function validateFileSize(
  file: File,
  maxSizeBytes: number,
): string | null {
  if (file.size > maxSizeBytes) {
    return `File size ${formatFileSize(file.size)} exceeds maximum allowed size ${formatFileSize(maxSizeBytes)}`
  }
  return null
}

/**
 * Validate file type against allowed MIME types
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., ['image/png', 'image/jpeg'])
 * @returns Error message if validation fails, null otherwise
 */
export function validateFileType(
  file: File,
  allowedTypes: string[],
): string | null {
  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
  }
  return null
}
