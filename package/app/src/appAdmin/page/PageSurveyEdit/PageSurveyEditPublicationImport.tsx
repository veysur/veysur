import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'

import { usePageTitle } from 'hook'
import { PageHeader } from 'component/PageHeader'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  useImportSurveyPublication,
  useFileUpload,
  FileUploadZone,
  FileInfoDisplay,
} from 'appAdmin/component/ImportExport'
import {
  SurveyImportProgressView,
  SurveyImportCompleteView,
  SurveyImportErrorView,
} from 'appAdmin/component/SurveyImport'
import { Alert, AlertDescription } from 'component/shadcn/alert'

type ImportState = {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error'
}

export const PageSurveyEditPublicationImport: React.FC = () => {
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const { importSurveyPublication, isLoading, error, validationError, result } =
    useImportSurveyPublication()

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
    acceptedExtensions: ['.vssp'],
  })

  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
  })

  usePageTitle(`Import Publication - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const handleImport = async () => {
    if (!selectedFile || !survey?._id) return

    setImportState({ status: 'uploading' })

    try {
      const result = await importSurveyPublication({
        file: selectedFile,
        options: { surveyId: survey._id },
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

  const handleReset = () => {
    resetFileUpload()
    setImportState({ status: 'idle' })
  }

  const handleViewPublications = () => {
    navigate(`/survey/${survey?._id}/publication`)
  }

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        onBackClick={handleViewPublications}
        pageHeader={
          <PageHeader
            icon={Upload}
            title="Import Publication"
            description="Upload a .vssp file to import a survey publication into this survey."
            maxWidth="max-w-none"
            showBack={false}
          />
        }
      >
        <div className="mt-6 w-md mx-auto">
          {importState.status === 'idle' && (
            <>
              <FileUploadZone
                accept=".vssp"
                fileTypeLabel="VSSP files only (.vssp)"
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
                  importButtonText="Import Publication"
                  onClear={handleReset}
                  onImport={handleImport}
                  isLoading={isLoading}
                  size="lg"
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
              onViewSurveys={handleViewPublications}
            />
          )}

          {importState.status === 'error' && error && (
            <SurveyImportErrorView
              error={error}
              validationError={validationError || undefined}
              forceMode={false}
              onReset={handleReset}
              onRetry={handleImport}
            />
          )}
        </div>
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditPublicationImport
