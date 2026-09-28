import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
  SurveyPublicationSelector,
} from 'appAdmin/component/SurveyEditor'
import { usePublicationList } from 'appAdmin/component/SurveyPublication/hook'
import { useSurveyPageFilters } from 'appAdmin/component/SurveyResponse'
import {
  useFileUpload,
  FileUploadZone,
  FileInfoDisplay,
} from 'appAdmin/component/ImportExport'
import { useImportSurveyResponse } from 'appAdmin/component/ImportExport/hook'
import { usePageTitle } from 'hook'
import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'

type ImportStatus = 'idle' | 'importing' | 'complete'

export const PageSurveyEditResponseImport: React.FC = () => {
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)

  usePageTitle(`Import Responses - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { publications } = usePublicationList({
    surveyId: survey?._id,
    perPage: 100,
  })

  const filters = useSurveyPageFilters({ publications })
  const snapshotId = filters.getSnapshotIdForData()

  const { importSurveyResponse, isLoading } = useImportSurveyResponse()

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
    acceptedExtensions: ['.csv'],
    validateFile: (file) => {
      if (!file.name.endsWith('.csv')) return 'Please select a CSV file'
      return null
    },
  })

  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importResult, setImportResult] = useState<{
    skipped: number
    warnings: string[]
  } | null>(null)

  const handleBack = () => {
    navigate(`/survey/${survey?._id}/response`)
  }

  const handleImport = async () => {
    if (
      !selectedFile ||
      !survey?._id ||
      !filters.selectedPublicationId ||
      !snapshotId
    )
      return

    setImportStatus('importing')

    try {
      const result = await importSurveyResponse({
        file: selectedFile,
        surveyId: survey._id,
        publicationId: filters.selectedPublicationId,
        snapshotId,
      })

      // A queued (async) import already showed its own flash message and
      // is tracked via the notification bell, not this page - reset back
      // to idle rather than waiting here for a result that may never come
      // on this page load.
      if (result) {
        setImportResult({
          skipped: result.discards?.length ?? 0,
          warnings: (result.warnings ?? []).map((warning) => warning.message),
        })
        setImportStatus('complete')
      } else {
        handleReset()
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Import failed')
      setImportStatus('idle')
    }
  }

  const handleReset = () => {
    resetFileUpload()
    setImportResult(null)
    setImportStatus('idle')
  }

  const canImport =
    !!survey?._id && !!filters.selectedPublicationId && !!snapshotId

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/response`}
        onBackClick={handleBack}
      >
        <h2 className="text-xl font-semibold mb-4">Import Responses</h2>

        <div className="mb-4">
          <SurveyPublicationSelector
            surveyId={survey?._id}
            selectedPublicationId={filters.selectedPublicationId}
            onPublicationChange={filters.handlePublicationChange}
          />
        </div>

        {importStatus === 'idle' && (
          <>
            <FileUploadZone
              accept=".csv"
              fileTypeLabel="CSV files only"
              onFileSelect={handleFileSelect}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              fileInputRef={fileInputRef}
            />

            {uploadError && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {fileName && selectedFile && (
              <FileInfoDisplay
                fileName={fileName}
                importButtonText="Import Responses"
                onClear={handleReset}
                onImport={handleImport}
                isLoading={isLoading || !canImport}
              />
            )}

            {!canImport && selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Select a publication above before importing.
              </p>
            )}
          </>
        )}

        {importStatus === 'importing' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-muted-foreground">Importing responses…</p>
          </div>
        )}

        {importStatus === 'complete' && importResult && (
          <div className="py-4">
            <Alert variant="default" className="mb-4">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                <strong>Import complete.</strong>
                {importResult.skipped > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    {importResult.skipped} row
                    {importResult.skipped !== 1 ? 's' : ''} skipped (participant
                    already has a response in this publication).
                  </span>
                )}
              </AlertDescription>
            </Alert>
            {importResult.warnings.length > 0 && (
              <Alert variant="default" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.warnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline">
                Import More
              </Button>
              <Button onClick={handleBack}>Back to Responses</Button>
            </div>
          </div>
        )}
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditResponseImport
