import React from 'react'
import { CheckCircle2, Circle, AlertTriangle, CloudUpload } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import { type Patch, type PatchBuffer } from 'veysur-common'

import { cn } from 'common/cn'
import { Badge } from 'component/shadcn/badge'
import { Spinner } from 'component/shadcn/spinner'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

const SURVEY_SAVE_STATUS_PENDING = 'pending'
const SURVEY_SAVE_STATUS_SAVING = 'saving'
const SURVEY_SAVE_STATUS_SUCCESS = 'success'
const SURVEY_SAVE_STATUS_ERROR = 'error'
const SURVEY_SAVE_STATUS_FETCHING = 'fetching'

type SurveySaveStatus = 'pending' | 'saving' | 'success' | 'error' | 'fetching'

type SurveySaveStatusData = {
  patchMutation: UseMutationResult<void, unknown, Patch[]> | undefined
  patchBuffer: PatchBuffer | undefined
  isLoading: boolean
  isFetching: boolean
}

type StatusTest = (data: SurveySaveStatusData) => boolean | undefined

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

type SurveySaveStatusConfig = {
  status: SurveySaveStatus
  icon: React.ReactNode
  text: string
  spinner: boolean
  statusTest: StatusTest
  variant: BadgeVariant
  className?: string
}

const statusConfig: Record<string, SurveySaveStatusConfig> = {
  [SURVEY_SAVE_STATUS_SAVING]: {
    status: SURVEY_SAVE_STATUS_SAVING,
    icon: <CloudUpload className="h-4 w-4" />,
    text: 'Saving',
    spinner: true,
    variant: 'default',
    className: 'save-status-saving',
    statusTest: ({ patchMutation }) => patchMutation?.isPending,
  },
  // "Modified" must be checked before "Saved": when a previous save completed
  // (patchMutation.isSuccess) but new patches are already pending, the user has
  // unsaved changes. Showing "Saved" in that state would be incorrect and causes
  // waitForSaved to return early in e2e tests before new patches are persisted.
  [SURVEY_SAVE_STATUS_PENDING]: {
    status: SURVEY_SAVE_STATUS_PENDING,
    icon: <Circle className="h-4 w-4" />,
    text: 'Modified',
    spinner: false,
    variant: 'default',
    className:
      'save-status-pending bg-warning text-warning-foreground hover:bg-warning/90 rounded-md',
    statusTest: ({ patchBuffer }) => patchBuffer?.hasPending(),
  },
  [SURVEY_SAVE_STATUS_SUCCESS]: {
    status: SURVEY_SAVE_STATUS_SUCCESS,
    icon: <CheckCircle2 className="h-4 w-4" />,
    text: 'Saved',
    spinner: false,
    variant: 'default',
    className:
      'save-status-success bg-success text-success-foreground hover:bg-success/90 rounded-md',
    statusTest: ({ patchMutation }) => patchMutation?.isSuccess,
  },
  [SURVEY_SAVE_STATUS_FETCHING]: {
    status: SURVEY_SAVE_STATUS_FETCHING,
    icon: <Circle className="h-4 w-4" />,
    text: 'Loading',
    spinner: true,
    variant: 'secondary',
    className: 'save-status-fetching',
    statusTest: ({ isLoading, isFetching }) => isLoading || isFetching,
  },
  [SURVEY_SAVE_STATUS_ERROR]: {
    status: SURVEY_SAVE_STATUS_ERROR,
    icon: <AlertTriangle className="h-4 w-4" />,
    text: 'Save Failed',
    spinner: false,
    variant: 'destructive',
    className: 'save-status-error',
    statusTest: ({ patchBuffer }) => patchBuffer?.hasError(),
  },
}

export const SurveySaveStatus: React.FC = () => {
  // Read data directly from store
  const patchMutation = useSurveyEditorStore((state) => state.patchMutation)
  const patchBuffer = useSurveyEditorStore((state) => state.patchBuffer)
  const isLoading = useSurveyEditorStore((state) => state.isLoading)
  const isFetching = useSurveyEditorStore((state) => state.isFetching)

  const data: SurveySaveStatusData = {
    patchMutation,
    patchBuffer,
    isLoading,
    isFetching,
  }

  const saveStatus = Object.values(statusConfig).find((statusConfig) => {
    return statusConfig.statusTest(data)
  })

  if (!saveStatus) return null

  return (
    <div
      className={cn('survey-save-status text-xs', saveStatus.className)}
      data-testid="save-status"
    >
      <Badge
        variant={saveStatus.variant}
        className={cn(
          'flex items-center gap-2 px-2 py-1',
          saveStatus.className,
        )}
      >
        {saveStatus.icon}
        <span className="save-status-text">{saveStatus.text}</span>
        {saveStatus.spinner && <Spinner size="sm" className="text-current" />}
      </Badge>
    </div>
  )
}
