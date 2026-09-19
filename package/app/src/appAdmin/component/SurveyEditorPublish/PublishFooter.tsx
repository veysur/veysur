import React, { useState } from 'react'
import { XCircle, Cloud } from 'lucide-react'
import { SurveyComparisonResult } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { Spinner } from 'component/shadcn/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'component/shadcn/alert-dialog'

type Props = {
  isPublished: boolean
  onCancel: () => void
  onPublish: () => void
  onUnpublish: () => void
  isSettingsSaving: boolean
  isPublishPending: boolean
  isUnpublishPending: boolean
  comparison?: SurveyComparisonResult | null
  isLoadingComparison?: boolean
  isComparingWithPublished?: boolean
  incompatibleConfirmed?: boolean
}

export const PublishFooter: React.FC<Props> = ({
  isPublished,
  onCancel,
  onPublish,
  onUnpublish,
  isSettingsSaving,
  isPublishPending,
  isUnpublishPending,
  comparison,
  isLoadingComparison = false,
  isComparingWithPublished = false,
  incompatibleConfirmed,
}) => {
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false)

  // Check if there are actually any changes
  const hasChanges = comparison?.summary
    ? comparison.summary.totalChanges > 0
    : true // If no summary, assume there are changes

  const isEquivalent =
    Boolean(comparison?.isEquivalent === true || (comparison && !hasChanges)) &&
    isComparingWithPublished

  const isIncompatibleUnconfirmed =
    comparison != null && !comparison.isCompatible && !incompatibleConfirmed

  const publishDisabled =
    isSettingsSaving ||
    isPublishPending ||
    isLoadingComparison ||
    (isEquivalent && isComparingWithPublished) ||
    isIncompatibleUnconfirmed

  const publishTooltip = isLoadingComparison
    ? 'Checking for changes...'
    : isIncompatibleUnconfirmed
      ? 'Confirm you understand the impact of incompatible changes before publishing'
      : isEquivalent && isComparingWithPublished
        ? 'Survey unchanged from published snapshot'
        : undefined

  return (
    <>
      <div className="flex justify-between w-full">
        {/* Left side: Cancel and Unpublish */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <span>Cancel</span>
          </Button>
          {isPublished && (
            <>
              <div className="w-px h-5 bg-border" aria-hidden />
              <Button
                variant="destructive"
                onClick={() => setShowUnpublishDialog(true)}
                disabled={isSettingsSaving || isUnpublishPending}
                className="flex items-center gap-2"
              >
                {isUnpublishPending ? (
                  <Spinner size="sm" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span>Unpublish</span>
              </Button>
            </>
          )}
        </div>

        {/* Right side: Publish */}
        <div>
          <Button
            variant="default"
            onClick={onPublish}
            disabled={publishDisabled}
            className="flex items-center gap-2"
            tooltip={publishTooltip}
          >
            {isPublishPending ? (
              <Spinner size="sm" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            Publish
          </Button>
        </div>
      </div>

      <AlertDialog
        open={showUnpublishDialog}
        onOpenChange={setShowUnpublishDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish this survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately take the survey offline. Participants will
              no longer be able to access it. You can re-publish at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowUnpublishDialog(false)
                onUnpublish()
              }}
              disabled={isUnpublishPending}
            >
              {isUnpublishPending ? <Spinner size="sm" /> : null}
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
