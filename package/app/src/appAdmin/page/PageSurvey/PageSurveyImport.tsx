import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Upload, Plus } from 'lucide-react'

import { usePageTitle } from 'hook'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import { PageHeader } from 'component/PageHeader'
import {
  useImportSurvey,
  useImportSurveyFull,
  useImportSurveyMarkdown,
  useFileUpload,
  FileUploadZone,
  FileInfoDisplay,
} from 'appAdmin/component/ImportExport'
import {
  SurveyImportProgressView,
  SurveyImportCompleteView,
  SurveyImportErrorView,
} from 'appAdmin/component/SurveyImport'
import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription } from 'component/shadcn/alert'

type ImportState = {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error'
}

export const PageSurveyImport: React.FC = () => {
  const navigate = useNavigate()
  const {
    importSurvey,
    isLoading: isLoadingSurvey,
    error: surveyError,
    validationError: surveyValidationError,
    result: surveyResult,
  } = useImportSurvey()
  const {
    importSurveyFull,
    isLoading: isLoadingFull,
    error: fullError,
    validationError: fullValidationError,
    result: fullResult,
  } = useImportSurveyFull()
  const {
    importSurveyMarkdown,
    isLoading: isLoadingMarkdown,
    error: markdownError,
    validationError: markdownValidationError,
    result: markdownResult,
  } = useImportSurveyMarkdown()

  const {
    selectedFile,
    fileName,
    uploadError,
    fileInputRef,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    setUploadError,
    reset: resetFileUpload,
  } = useFileUpload({
    acceptedExtensions: ['.vsst', '.vssa', '.md'],
  })

  const [forceMode, setForceMode] = useState<boolean>(false)
  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
  })

  usePageTitle('Import Survey', { suffix: 'Veysur Admin' })

  const isVssFull = fileName?.endsWith('.vssa') ?? false
  const isMarkdown = fileName?.endsWith('.md') ?? false
  const isLoading = isVssFull
    ? isLoadingFull
    : isMarkdown
      ? isLoadingMarkdown
      : isLoadingSurvey
  const error = isVssFull ? fullError : isMarkdown ? markdownError : surveyError
  const validationError = isVssFull
    ? fullValidationError
    : isMarkdown
      ? markdownValidationError
      : surveyValidationError
  const result = isVssFull
    ? fullResult
    : isMarkdown
      ? markdownResult
      : surveyResult

  const runSurveyImport = async (force: boolean) => {
    if (!selectedFile) return

    setImportState({ status: 'uploading' })

    try {
      const importFn = isMarkdown ? importSurveyMarkdown : importSurvey
      const result = await importFn({
        file: selectedFile,
        options: { force },
        onProgress: (progress) => {
          setImportState({ status: progress.stage })
        },
      })
      // A queued (async) import already showed its own flash message and
      // is tracked via the notification bell, not this page - reset back
      // to idle rather than waiting here for a result that may never come
      // on this page load.
      if (result) {
        setImportState({ status: 'complete' })
      } else {
        handleReset()
      }
    } catch (err) {
      console.error('Import error:', err)
      setImportState({ status: 'error' })
      setUploadError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    if (isVssFull) {
      setImportState({ status: 'uploading' })
      try {
        const result = await importSurveyFull({
          file: selectedFile,
          onProgress: (progress) => {
            setImportState({ status: progress.stage })
          },
        })
        if (result) {
          setImportState({ status: 'complete' })
        } else {
          handleReset()
        }
      } catch (err) {
        console.error('Import error:', err)
        setImportState({ status: 'error' })
        setUploadError(err instanceof Error ? err.message : 'Import failed')
      }
      return
    }

    await runSurveyImport(forceMode)
  }

  const handleReset = () => {
    resetFileUpload()
    setForceMode(false)
    setImportState({ status: 'idle' })
  }

  const handleViewSurveys = () => {
    navigate('/survey')
  }

  const handleRetryWithForce = async () => {
    setForceMode(true)
    await runSurveyImport(true)
  }

  return (
    <AdminPageLayout className="container-lg p-4">
      <PageHeader
        icon={Upload}
        title="Import Survey"
        description="Upload a .vsst, .vssa, or .md file to import a survey into your project"
        maxWidth="max-w-none"
        showBack={false}
        inlineNav={
          <Button
            size="sm"
            variant="outline"
            tooltip="Create New Survey"
            asChild
          >
            <Link to="/survey/new">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="row mt-3 justify-center">
        <div className="mt-10 w-md mx-auto">
          {importState.status === 'idle' && (
            <>
              <FileUploadZone
                accept=".vsst,.vssa,.md"
                fileTypeLabel="VSST, VSSA, or Markdown files (.vsst, .vssa, .md)"
                onFileSelect={handleFileSelect}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                fileInputRef={fileInputRef}
              />

              {uploadError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {fileName && selectedFile && (
                <FileInfoDisplay
                  fileName={fileName}
                  importButtonText="Import Survey"
                  onClear={handleReset}
                  onImport={handleImport}
                  isLoading={isLoading}
                  size="lg"
                  forceMode={
                    !isVssFull
                      ? {
                          enabled: forceMode,
                          onChange: setForceMode,
                          label: 'Enable force mode',
                          description:
                            'Automatically repair validation errors by removing invalid references and fixing schema issues.',
                        }
                      : undefined
                  }
                />
              )}
            </>
          )}

          {(importState.status === 'uploading' ||
            importState.status === 'processing') && (
            <SurveyImportProgressView stage={importState.status} />
          )}

          {importState.status === 'complete' && result && (
            <SurveyImportCompleteView
              result={result}
              onReset={handleReset}
              onViewSurveys={handleViewSurveys}
            />
          )}

          {importState.status === 'error' && error && (
            <SurveyImportErrorView
              error={error}
              validationError={validationError || undefined}
              forceMode={forceMode}
              onReset={handleReset}
              onRetry={handleImport}
              onRetryWithForce={!isVssFull ? handleRetryWithForce : undefined}
            />
          )}
        </div>
      </div>
    </AdminPageLayout>
  )
}

export default PageSurveyImport
