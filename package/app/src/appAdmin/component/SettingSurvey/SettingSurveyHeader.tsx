import React from 'react'
import { AlertTriangle, Save, X } from 'lucide-react'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'component/shadcn/tooltip'

interface SettingSurveyHeaderProps {
  isAnythingDirty: boolean
  isSaving: boolean
  isLoading: boolean
  saveError: Error | null
  onSave: () => void
  onCancel: () => void
}

export const SettingSurveyHeader: React.FC<SettingSurveyHeaderProps> = ({
  isAnythingDirty,
  isSaving,
  isLoading,
  saveError,
  onSave,
  onCancel,
}) => {
  const disabled = !isAnythingDirty || isSaving || isLoading

  return (
    <div className="flex flex-1 items-center justify-between gap-2">
      <div className="min-w-0">
        <h4 className="text-lg font-semibold whitespace-nowrap">
          Survey Default Settings
        </h4>
        <small className="text-muted-foreground text-xs whitespace-nowrap">
          Configure default settings for new surveys
        </small>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        {saveError && (
          <Alert variant="destructive" className="mb-0 py-1 px-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Failed to save changes
            </AlertDescription>
          </Alert>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onCancel}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={onSave} disabled={disabled}>
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
