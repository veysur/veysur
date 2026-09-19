import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Upload, Plus } from 'lucide-react'

import { usePageTitle } from 'hook'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import { SectionHeader } from 'component/SectionHeader'
import {
  useImportSurvey,
  useImportSurveyFull,
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
    acceptedExtensions: ['.vsst', '.vssa'],
  })

  const [forceMode, setForceMode] = useState<boolean>(false)
  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
  })

  usePageTitle('Import Survey', { suffix: 'Veysur Admin' })

  const isVss = fileName?.endsWith('.vssa') ?? false
  const isLoading = isVss ? isLoadingFull : isLoadingSurvey
  const error = isVss ? fullError : surveyError
  const validationError = isVss ? fullValidationError : surveyValidationError
  const result = isVss ? fullResult : surveyResult

  const runSurveyImport = async (force: boolean) => {
    if (!selectedFile) return

    setImportState({ status: 'uploading' })

    try {
      await importSurvey({
        file: selectedFile,
        options: { force },
        onProgress: (progress) => {
          setImportState({ status: progress.stage })
        },
      })
      setImportState({ status: 'complete' })
    } catch (err) {
      console.error('Import error:', err)
      setImportState({ status: 'error' })
      setUploadError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    if (isVss) {
      setImportState({ status: 'uploading' })
      try {
        await importSurveyFull({
          file: selectedFile,
          onProgress: (progress) => {
            setImportState({ status: progress.stage })
          },
        })
        setImportState({ status: 'complete' })
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
      <SectionHeader
        icon={Upload}
        title="Import Survey"
        description="Upload a .vsst or .vssa file to import a survey into your project"
      >
        <Button size="sm" variant="outline" tooltip="Create New Survey" asChild>
          <Link to="/survey/new">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </SectionHeader>

      <div className="row mt-3 justify-center">
        <div className="mt-10 w-md mx-auto">
          {importState.status === 'idle' && (
            <>
              <FileUploadZone
                accept=".vsst,.vssa"
                fileTypeLabel="VSST or VSSA files (.vsst, .vssa)"
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
                    !isVss
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
              onRetryWithForce={!isVss ? handleRetryWithForce : undefined}
            />
          )}
        </div>
      </div>
    </AdminPageLayout>
  )
}

export default PageSurveyImport
