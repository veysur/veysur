import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, AlertCircle } from 'lucide-react'

import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import { usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'
import {
  useSurveyParticipantImport,
  ImportProgressData,
} from 'appAdmin/component/SurveyParticipant/hook'
import {
  ImportHelpModal,
  ImportProgressView,
  ImportCompleteView,
} from 'appAdmin/component/SurveyParticipant'
import {
  useFileUpload,
  FileUploadZone,
  FileInfoDisplay,
} from 'appAdmin/component/ImportExport'
import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription } from 'component/shadcn/alert'

type ImportState = {
  status: 'idle' | 'importing' | 'complete'
  imported: number
  errors: number
  errorList: Array<{ row: number; message: string }>
}

export const PageSurveyEditParticipantImport: React.FC = () => {
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const { setFlashMessage } = useFlashMessage()
  const { importParticipants, isLoading } = useSurveyParticipantImport(
    survey?._id || '',
  )

  const handleBack = () => {
    navigate(`/survey/${survey?._id}/participant`)
  }

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
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        return 'Please select a CSV file'
      }
      return null
    },
  })

  const [showHelp, setShowHelp] = useState(false)
  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
    imported: 0,
    errors: 0,
    errorList: [],
  })

  usePageTitle(`Import Participants - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const handleImport = async () => {
    if (!selectedFile) return

    setImportState({
      status: 'importing',
      imported: 0,
      errors: 0,
      errorList: [],
    })

    try {
      await importParticipants({
        file: selectedFile,
        onProgress: (data: ImportProgressData) => {
          if (data.type === 'progress') {
            setImportState((prev) => ({
              ...prev,
              imported: data.imported,
              errors: data.errors,
              errorList: data.batchErrors
                ? [...prev.errorList, ...data.batchErrors]
                : prev.errorList,
            }))
          } else if (data.type === 'complete') {
            if (data.errors === 0) {
              setFlashMessage(
                'success',
                `Successfully imported ${data.imported} participant${data.imported !== 1 ? 's' : ''}`,
              )
              navigate(`/survey/${survey?._id}/participant`)
            } else {
              setImportState((prev) => ({
                status: 'complete',
                imported: data.imported,
                errors: data.errors,
                errorList: prev.errorList,
              }))
            }
          } else if (data.type === 'error' && data.message) {
            setUploadError(data.message)
          }
        },
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Import failed')
      setImportState((prev) => ({
        ...prev,
        status: 'idle',
      }))
    }
  }

  const handleReset = () => {
    resetFileUpload()
    setImportState({
      status: 'idle',
      imported: 0,
      errors: 0,
      errorList: [],
    })
  }

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/participant`}
        onBackClick={handleBack}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Import Participants</h2>
          <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
            <HelpCircle size={16} className="mr-1" />
            CSV Format Help
          </Button>
        </div>
        {importState.status === 'idle' && (
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
              <Alert variant="destructive" className="mb-4">
                <AlertCircle size={16} />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {fileName && selectedFile && (
              <FileInfoDisplay
                fileName={fileName}
                importButtonText="Import Participants"
                onClear={handleReset}
                onImport={handleImport}
                isLoading={isLoading}
              />
            )}
          </>
        )}

        {importState.status === 'importing' && (
          <ImportProgressView
            imported={importState.imported}
            errors={importState.errors}
          />
        )}

        {importState.status === 'complete' && (
          <ImportCompleteView
            imported={importState.imported}
            errors={importState.errors}
            errorList={importState.errorList}
            onReset={handleReset}
          />
        )}
      </SurveyPageContent>

      <ImportHelpModal show={showHelp} onHide={() => setShowHelp(false)} />
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditParticipantImport
