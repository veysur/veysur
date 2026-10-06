import React, { useState } from 'react'
import { Download } from 'lucide-react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { Checkbox } from 'component/shadcn/checkbox'
import { Label } from 'component/shadcn/label'
import {
  FileInfoDisplay,
  FileUploadZone,
  ProjectImportPart,
  useFileUpload,
  useImportProjectSettings,
  useProjectSettingsExport,
} from 'appAdmin/component/ImportExport'

const PART_LABELS: Record<ProjectImportPart, string> = {
  timezone: 'Project timezone',
  settings: 'Survey settings (defaults for all surveys)',
  templates: 'Project email templates',
}

type Props = {
  isOwner: boolean
}

export const ProjectSettingsTransfer: React.FC<Props> = ({ isOwner }) => {
  const {
    exportProjectSettings,
    isExporting,
    error: exportError,
  } = useProjectSettingsExport()
  const {
    importProjectSettings,
    isLoading: isImporting,
    error: importError,
    validationError,
    result,
  } = useImportProjectSettings()

  const upload = useFileUpload({ acceptedExtensions: ['.vsps'] })
  const [apply, setApply] = useState<Record<ProjectImportPart, boolean>>({
    timezone: isOwner,
    settings: true,
    templates: true,
  })

  const selectedParts = (Object.keys(apply) as ProjectImportPart[]).filter(
    (part) => apply[part],
  )

  const handleImport = async () => {
    if (!upload.selectedFile || selectedParts.length === 0) return
    try {
      await importProjectSettings({
        file: upload.selectedFile,
        apply: selectedParts,
      })
    } catch {
      // surfaced through importError / validationError
    }
  }

  const errorMessages =
    validationError?.errors?.map((error) => error.message) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export and import</CardTitle>
        <CardDescription>
          Copy project settings to another project, or keep a backup. The file
          includes the timezone, survey settings and project email templates.
          Survey schedules are not included.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {exportError && (
          <Alert variant="destructive">
            <AlertDescription>{exportError}</AlertDescription>
          </Alert>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isExporting}
          onClick={() => exportProjectSettings()}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export project settings (.vsps)'}
        </Button>

        <div className="space-y-3 border-t pt-4">
          <div className="text-sm font-medium">Import</div>
          <div className="space-y-2">
            {(Object.keys(PART_LABELS) as ProjectImportPart[]).map((part) => {
              const disabled = part === 'timezone' && !isOwner
              return (
                <div key={part} className="flex items-center gap-2">
                  <Checkbox
                    id={`import-part-${part}`}
                    checked={apply[part]}
                    disabled={disabled || isImporting}
                    onCheckedChange={(checked) =>
                      setApply((current) => ({
                        ...current,
                        [part]: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor={`import-part-${part}`}>
                    {PART_LABELS[part]}
                    {disabled ? ' (project owner only)' : ''}
                  </Label>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground">
              Settings are replaced. Email templates overwrite the ones for the
              same type and language; others are kept.
            </p>
          </div>

          {(upload.uploadError || importError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {upload.uploadError ?? importError}
                {errorMessages.length > 0 && (
                  <ul className="mt-1 list-disc pl-4">
                    {errorMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {result ? (
            <Alert
              variant={result.details?.some(isFailed) ? 'warning' : 'default'}
            >
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {result.details?.map((outcome) => (
                    <li key={outcome.part}>
                      {PART_LABELS[outcome.part as ProjectImportPart] ??
                        outcome.part}
                      : {outcome.status}
                      {outcome.message ? ` (${outcome.message})` : ''}
                    </li>
                  ))}
                  {result.warnings?.map((warning) => (
                    <li key={warning.message}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : upload.fileName ? (
            <FileInfoDisplay
              fileName={upload.fileName}
              onClear={upload.reset}
              onImport={handleImport}
              isLoading={isImporting || selectedParts.length === 0}
              importButtonText="Import settings"
              size="sm"
            />
          ) : (
            <FileUploadZone
              accept=".vsps"
              fileTypeLabel="VeySur project settings file (.vsps)"
              onFileSelect={upload.handleFileSelect}
              onDrop={upload.handleDrop}
              onDragOver={upload.handleDragOver}
              fileInputRef={upload.fileInputRef}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function isFailed(outcome: { status: string }): boolean {
  return outcome.status === 'failed'
}
