import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle } from 'lucide-react'

import { useFlashMessage } from 'component/FlashMessage'
import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import { MergePreview } from 'appAdmin/component/Merge/MergePreview'
import { formatIncompatibility } from 'appAdmin/component/SurveyEditorPublish/CompatibilityStatus'
import { PageHeader } from 'component/PageHeader'
import { usePageTitle } from 'hook'
import {
  usePublicationList,
  usePublicationMerge,
  usePublicationMergePreview,
} from 'appAdmin/component/SurveyPublication/hook'
import { formatPublicationName } from 'appAdmin/component/SurveyPublication/util'
import { useDisplayTimezone } from 'appAdmin/hook'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'

export const PageSurveyEditPublicationMerge: React.FC = () => {
  const navigate = useNavigate()
  const { surveyId, publicationId } = useParams<{
    surveyId: string
    publicationId: string
  }>()
  const survey = useSurveyEditorStore((state) => state.survey)
  const tz = useDisplayTimezone()

  const [sourcePublicationId, setSourcePublicationId] = useState<string>('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { setFlashMessage } = useFlashMessage()

  usePageTitle(`Merge Responses - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  // Fetch all publications
  const { publications } = usePublicationList({
    surveyId,
    page: 1,
    perPage: 100, // Get all publications
  })

  // Find target publication
  const targetPublication = publications.find((p) => p._id === publicationId)

  // Fetch preview when source selected
  const {
    previewResult,
    isLoading: isPreviewLoading,
    error: previewError,
  } = usePublicationMergePreview(surveyId!, publicationId!, sourcePublicationId)

  // Mutation for actual merge
  const { publicationMerge, isLoading: isMerging } = usePublicationMerge(
    surveyId!,
    publicationId!,
    sourcePublicationId,
  )

  const handleMerge = () => {
    setShowConfirmDialog(true)
  }

  const confirmMerge = async () => {
    try {
      const result = await publicationMerge({ dryRun: false })
      setShowConfirmDialog(false)

      const count = result.stats.responsesCreated || 0
      setFlashMessage(
        'success',
        `Successfully merged ${count} response${count !== 1 ? 's' : ''}`,
      )

      // Navigate back to responses page with success message
      navigate(
        `/survey/${surveyId}/response/snapshot/${targetPublication?.snapshotId}?filterMode=publication&publicationId=${publicationId}`,
        {
          state: {
            mergeSuccess: true,
            mergeStats: result.stats,
          },
        },
      )
    } catch (error) {
      console.error('Merge failed:', error)
      setShowConfirmDialog(false)
    }
  }

  // Find source publication for display
  const sourcePublication = publications.find(
    (p) => p._id === sourcePublicationId,
  )

  // Check if preview shows incompatibility
  const isIncompatible =
    previewResult && !previewResult.compatibility.isCompatible

  // Nothing will be created by merging, regardless of the reason (no source
  // responses, all already merged, or all skipped as participant duplicates)
  const noMergeableResponses =
    previewResult && previewResult.stats.responsesCreated === 0

  const noMergeableResponsesLabel = (() => {
    if (!previewResult) return 'No Responses to Merge'
    if (previewResult.stats.sourceResponseCount === 0) {
      return 'No Responses to Merge'
    }
    if (previewResult.stats.responsesAlreadyMerged > 0) {
      return 'All Responses Already Merged'
    }
    if (previewResult.stats.responsesSkippedParticipantDuplicate > 0) {
      return 'No New Responses to Merge'
    }
    return 'No Responses to Merge'
  })()

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${surveyId}/publication`}
        pageHeader={
          <PageHeader
            title={`Merge Responses into: ${targetPublication?.label || 'Publication'}`}
            description="Copy responses from a source publication to this publication. Answers that cannot be mapped will be skipped."
            maxWidth="max-w-none"
            showBack={false}
          />
        }
      >
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Source Publication + Compatibility */}
          <div className="rounded-xl border bg-card shadow-sm divide-y divide-border">
            <div className="px-6 py-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Source Publication
              </label>
              <Select
                value={sourcePublicationId}
                onValueChange={setSourcePublicationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source publication..." />
                </SelectTrigger>
                <SelectContent>
                  {publications
                    .filter((p) => p._id !== publicationId)
                    .map((pub) => (
                      <SelectItem key={pub._id} value={pub._id}>
                        {formatPublicationName(pub, tz)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {sourcePublication && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span>
                    {sourcePublication.responseCount ?? 0} response
                    {(sourcePublication.responseCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                  {sourcePublication.label && (
                    <span>· {sourcePublication.label}</span>
                  )}
                  <span className="text-xs opacity-60 ml-auto">
                    ID: {sourcePublication._id.slice(-8)}
                  </span>
                </div>
              )}
            </div>

            {isPreviewLoading && (
              <div className="px-6 py-4 flex items-center text-sm text-muted-foreground">
                <Spinner size="sm" className="mr-2" />
                Analysing compatibility...
              </div>
            )}

            {previewError && (
              <div className="px-6 py-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load merge preview. Please try again.
                    <span className="mt-2 text-sm block">{previewError}</span>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {previewResult && (
              <div className="px-6 py-4">
                {previewResult.compatibility.isCompatible ? (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Compatible — no incompatible changes with the previous
                      snapshot.
                    </span>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      Survey modified - Incompatible with previous snapshot
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-1">
                        The following changes produce incompatible data:
                      </div>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {previewResult.compatibility.incompatibilities.map(
                          (issue, index) => (
                            <li key={index}>
                              {issue.message || formatIncompatibility(issue)}
                            </li>
                          ),
                        )}
                      </ul>
                      <div className="mt-3">
                        Existing responses may be missing data for fields
                        affected by these changes. You can still merge, but
                        historical response data for changed fields cannot be
                        recovered.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Preview Results */}
          {previewResult && sourcePublication && targetPublication && (
            <>
              <MergePreview mergeResult={previewResult} />

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/survey/${surveyId}/publication`)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={noMergeableResponses || isMerging}
                >
                  {isMerging ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Merging...
                    </>
                  ) : noMergeableResponses ? (
                    noMergeableResponsesLabel
                  ) : isIncompatible ? (
                    'Merge Anyway (Incompatible)'
                  ) : (
                    'Merge Responses'
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Confirmation Dialog */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Merge</DialogTitle>
                <DialogDescription>
                  Are you sure you want to merge responses from{' '}
                  <span className="font-semibold">
                    {sourcePublication?.label || 'the source publication'}
                  </span>{' '}
                  into{' '}
                  <span className="font-semibold">
                    {targetPublication?.label || 'the target publication'}
                  </span>
                  ?
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will create{' '}
                    {previewResult?.stats.responsesCreated || 0} new responses
                    in the target publication. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={confirmMerge}>Confirm Merge</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditPublicationMerge
