import React, { useState, useRef } from 'react'
import { Upload, XCircle, FileIcon, ExternalLink } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'
import { Progress } from 'component/shadcn/progress'
import { StatusAlert } from 'component/StatusAlert'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { RadioGroup, RadioGroupItem } from 'component/shadcn/radio-group'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { NavbarBrandAdmin } from 'appAdmin/component/Navbar'
import { usePageTitle } from 'hook'
import { useProjectDomain, useAuth } from 'appAdmin/hook'
import { getFileApi } from 'appAdmin/registry/getFileApi'
import {
  formatFileSize,
  validateFileSize,
  UploadProgress,
  UploadResult,
} from 'common/uploadFile'
import { S3_DEFAULT_BUCKET } from 'veysur-common'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const PageTestFileUpload: React.FC = () => {
  usePageTitle('File Upload Test', { suffix: 'Veysur Admin' })

  const project = useProjectDomain()
  const { auth } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  )
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Survey context state
  const [fileContext, setFileContext] = useState<
    'project' | 'survey' | 'response'
  >('project')
  const [surveyId, setSurveyId] = useState<string>('')
  const [responseId, setResponseId] = useState<string>('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset previous state
    setError(null)
    setUploadResult(null)
    setUploadProgress(null)

    // Validate file size
    const sizeError = validateFileSize(file, MAX_FILE_SIZE)
    if (sizeError) {
      setError(sizeError)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !project?._id) {
      setError('Please select a file and ensure you are in a project context')
      return
    }

    // Validate survey context requirements
    if (fileContext === 'survey' || fileContext === 'response') {
      if (!surveyId.trim()) {
        setError('Survey ID is required for survey and response files')
        return
      }
    }

    if (fileContext === 'response') {
      if (!responseId.trim()) {
        setError('Response ID is required for response files')
        return
      }
    }

    try {
      setIsUploading(true)
      setError(null)
      setUploadProgress(null)
      setUploadResult(null)

      // Refresh auth token

      // Get JWT token from auth
      const jwtToken = auth?.jwt?.token

      if (!jwtToken) {
        throw new Error('No JWT token available. Please log in again.')
      }

      // Upload file using FileApi with survey context
      const fileApi = getFileApi()
      const result = await fileApi.upload(project._id, jwtToken, selectedFile, {
        surveyId: fileContext !== 'project' ? surveyId : undefined,
        responseId: fileContext === 'response' ? responseId : undefined,
        fileContext: fileContext,
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress)
        },
      })

      setUploadResult(result)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setUploadProgress(null)
    setUploadResult(null)
    setError(null)
    setFileContext('project')
    setSurveyId('')
    setResponseId('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileUrl = () => {
    if (!uploadResult?.file) return null
    const baseUrl = window.location.protocol + '//' + window.location.host
    // filePath format is context-based, need to add bucket
    const bucketType = uploadResult.file.bucketType || 'public'
    const bucket =
      bucketType === 'private' ? 'veysur-private' : S3_DEFAULT_BUCKET
    return `${baseUrl}/${bucket}/${uploadResult.file.filePath}`
  }

  return (
    <div className="min-h-screen">
      <NavbarBrandAdmin />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6" />
              File Upload Test
            </CardTitle>
            <CardDescription>
              Test the S3-based file upload system with context-specific
              deduplication and progress tracking
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Project Info */}
            {project && (
              <Alert>
                <AlertDescription>
                  <strong>Project:</strong> {project.name || project._id}
                </AlertDescription>
              </Alert>
            )}

            {!project && (
              <Alert variant="destructive">
                <AlertTitle>No Project Selected</AlertTitle>
                <AlertDescription>
                  Please navigate to a project context to upload files.
                </AlertDescription>
              </Alert>
            )}

            {/* File Context Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                File Context
              </Label>
              <RadioGroup
                value={fileContext}
                onValueChange={(value) =>
                  setFileContext(value as 'project' | 'survey' | 'response')
                }
                disabled={isUploading}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="project" id="context-project" />
                  <Label htmlFor="context-project" className="cursor-pointer">
                    Project
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="survey" id="context-survey" />
                  <Label htmlFor="context-survey" className="cursor-pointer">
                    Survey
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="response" id="context-response" />
                  <Label htmlFor="context-response" className="cursor-pointer">
                    Response
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Survey ID Input (shown for survey and response contexts) */}
            {(fileContext === 'survey' || fileContext === 'response') && (
              <div className="space-y-2">
                <Label htmlFor="survey-id" className="text-sm font-medium">
                  Survey ID *
                </Label>
                <Input
                  id="survey-id"
                  type="text"
                  placeholder="Enter survey ID (e.g., survey_123)"
                  value={surveyId}
                  onChange={(e) => setSurveyId(e.target.value)}
                  disabled={isUploading}
                  className="w-full"
                />
              </div>
            )}

            {/* Response ID Input (shown only for response context) */}
            {fileContext === 'response' && (
              <div className="space-y-2">
                <Label htmlFor="response-id" className="text-sm font-medium">
                  Response ID *
                </Label>
                <Input
                  id="response-id"
                  type="text"
                  placeholder="Enter response ID (e.g., resp_456)"
                  value={responseId}
                  onChange={(e) => setResponseId(e.target.value)}
                  disabled={isUploading}
                  className="w-full"
                />
              </div>
            )}

            {/* File Input */}
            <div className="space-y-2">
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-gray-700"
              >
                Select File (Max {formatFileSize(MAX_FILE_SIZE)})
              </label>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                disabled={isUploading || !project}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <FileIcon className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)} •{' '}
                    {selectedFile.type || 'Unknown type'}
                  </p>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Uploading...</span>
                  <span>{uploadProgress.percentage}%</span>
                </div>
                <Progress value={uploadProgress.percentage} className="h-2" />
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadProgress.loaded)} /{' '}
                  {formatFileSize(uploadProgress.total)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || !project}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>

              <Button
                onClick={handleClear}
                variant="outline"
                disabled={isUploading}
              >
                Clear
              </Button>
            </div>

            {/* Success Message */}
            {uploadResult && (
              <StatusAlert
                variant="success"
                title={
                  uploadResult.existingFile
                    ? 'File Already Exists (Deduplicated)'
                    : 'Upload Successful!'
                }
              >
                <div>
                  <p className="font-medium mt-2">File Details:</p>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>
                      <strong>File ID:</strong> {uploadResult.fileId}
                    </li>
                    <li>
                      <strong>File Context:</strong>{' '}
                      {uploadResult.file.fileContext || 'project'}
                    </li>
                    {uploadResult.file.surveyId && (
                      <li>
                        <strong>Survey ID:</strong> {uploadResult.file.surveyId}
                      </li>
                    )}
                    {uploadResult.file.responseId && (
                      <li>
                        <strong>Response ID:</strong>{' '}
                        {uploadResult.file.responseId}
                      </li>
                    )}
                    <li>
                      <strong>File Path:</strong>{' '}
                      <code className="text-xs bg-green-100 px-1 rounded">
                        {uploadResult.file.filePath}
                      </code>
                    </li>
                    <li>
                      <strong>Original Name:</strong>{' '}
                      {uploadResult.file.filename}
                    </li>
                    <li>
                      <strong>Stored Name:</strong>{' '}
                      {uploadResult.file.storedFilename}
                    </li>
                    <li>
                      <strong>Size:</strong>{' '}
                      {formatFileSize(uploadResult.file.size)}
                    </li>
                    <li>
                      <strong>Hash:</strong>{' '}
                      <code className="text-xs">
                        {uploadResult.file.hash.substring(0, 16)}...
                      </code>
                    </li>
                    <li>
                      <strong>MIME Type:</strong> {uploadResult.file.mimeType}
                    </li>
                  </ul>
                </div>

                {uploadResult.existingFile && (
                  <p className="text-sm italic">
                    This file was previously uploaded. No S3 upload was needed
                    (deduplication).
                  </p>
                )}

                <div className="pt-2">
                  <a
                    href={getFileUrl() || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Uploaded File
                  </a>
                </div>
              </StatusAlert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-base">How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Select a file context (project, survey, or response)</li>
                  <li>Enter required IDs based on context</li>
                  <li>Select a file (up to 10 MB by default)</li>
                  <li>File hash is calculated (SHA256) before upload</li>
                  <li>
                    If file already exists with same hash AND same context, no
                    upload needed (context-specific deduplication)
                  </li>
                  <li>
                    If file exists with same hash but DIFFERENT context, file is
                    uploaded to new context-specific path (no cross-context
                    deduplication)
                  </li>
                  <li>
                    Otherwise, file is uploaded directly to S3 via presigned URL
                    to context-based path
                  </li>
                </ul>

                <div>
                  <p className="font-semibold mb-1">Context-Based Storage:</p>
                  <p className="text-xs mb-2">
                    Files are organized by context with hierarchical paths:
                  </p>
                  <ul className="text-xs space-y-1 ml-2">
                    <li>
                      <strong>Project:</strong>{' '}
                      <code className="bg-muted px-1 rounded">
                        {'{'}projectId{'}'}/{'{'}storedFilename{'}'}
                      </code>
                    </li>
                    <li>
                      <strong>Survey:</strong>{' '}
                      <code className="bg-muted px-1 rounded">
                        {'{'}projectId{'}'}/survey/{'{'}surveyId{'}'}/{'{'}
                        storedFilename{'}'}
                      </code>
                    </li>
                    <li>
                      <strong>Response:</strong>{' '}
                      <code className="bg-muted px-1 rounded">
                        {'{'}projectId{'}'}/survey/{'{'}surveyId{'}'}
                        /response/{'{'}responseId{'}'}/{'{'}storedFilename{'}'}
                      </code>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    • Each context has its own directory structure
                    <br />
                    • Enables safe bulk deletion via directory prefix
                    <br />• Same file in different contexts = separate S3
                    objects
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">Storage Details:</p>
                  <p className="text-xs text-muted-foreground">
                    Default bucket: <code>veysur-files</code> • Custom buckets
                    must start with <code>veysur-files</code> prefix • Files
                    organized by context for isolation and easy cleanup
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">Testing Scenarios:</p>
                  <ul className="text-xs list-disc list-inside space-y-1 ml-2">
                    <li>
                      Upload same file twice to SAME context → Returns existing
                      file (no upload)
                    </li>
                    <li>
                      Upload same file to DIFFERENT contexts → Creates separate
                      S3 objects in each context path
                    </li>
                    <li>
                      Check File Path shows context-based structure
                      (survey/surveyId or response/responseId)
                    </li>
                    <li>
                      Test bulk deletion: All files for a survey can be deleted
                      by directory prefix
                    </li>
                    <li>
                      Verify surveyId/responseId reflected in both metadata AND
                      file path
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PageTestFileUpload
