import React from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { SurveyComparisonResult, IncompatibilityDetail } from 'veysur-common'

import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'
import { Checkbox } from 'component/shadcn/checkbox'
import { Label } from 'component/shadcn/label'
import { Spinner } from 'component/shadcn/spinner'

type Props = {
  comparison: SurveyComparisonResult | null
  isLoading: boolean
  isComparingWithPublished: boolean
  incompatibleConfirmed?: boolean
  onIncompatibleConfirmChange?: (checked: boolean) => void
}

export const CompatibilityStatus: React.FC<Props> = ({
  comparison,
  isLoading,
  isComparingWithPublished,
  incompatibleConfirmed,
  onIncompatibleConfirmChange,
}) => {
  if (isLoading) {
    return (
      <Alert className="mb-4">
        <Spinner size="sm" className="mr-2" />
        <AlertDescription>Checking for changes...</AlertDescription>
      </Alert>
    )
  }

  if (!comparison) {
    return null
  }

  // Check if there are actually any changes
  // Use totalChanges which includes field changes (settings), not just added/modified/removed items
  const hasChanges = comparison.summary
    ? comparison.summary.totalChanges > 0
    : true // If no summary, assume there are changes

  // Equivalent - No changes (either isEquivalent flag or no actual changes)
  if (comparison.isEquivalent || !hasChanges) {
    // Only show blocking message if comparing with published snapshot
    if (isComparingWithPublished) {
      return (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>No changes detected</AlertTitle>
          <AlertDescription>
            The current survey is identical to the published snapshot.
          </AlertDescription>
        </Alert>
      )
    } else {
      // Comparing with unpublished snapshot - show info but don't block
      return (
        <Alert variant="info" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>No changes since last snapshot</AlertTitle>
          <AlertDescription>
            The current survey is identical to the most recent snapshot.
          </AlertDescription>
        </Alert>
      )
    }
  }

  // Has changes - Compatible
  if (comparison.isCompatible) {
    const { summary } = comparison
    const hasStructuralChanges =
      summary.addedItems > 0 ||
      summary.modifiedItems > 0 ||
      summary.removedItems > 0
    const fieldChangesCount =
      summary.totalChanges -
      (summary.addedItems +
        summary.modifiedItems +
        summary.removedItems +
        summary.reorderedCollections)

    return (
      <Alert variant="info" className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Survey modified - Compatible</AlertTitle>
        <AlertDescription>
          <div>
            {hasStructuralChanges ? (
              <>
                Changes: {summary.addedItems} added, {summary.modifiedItems}{' '}
                modified, {summary.removedItems} removed
                {fieldChangesCount > 0 &&
                  `, ${fieldChangesCount} setting${fieldChangesCount !== 1 ? 's' : ''} changed`}
              </>
            ) : fieldChangesCount > 0 ? (
              <>
                Survey settings changed ({fieldChangesCount} change
                {fieldChangesCount !== 1 ? 's' : ''})
              </>
            ) : (
              <>
                Survey modified ({summary.totalChanges} change
                {summary.totalChanges !== 1 ? 's' : ''})
              </>
            )}
          </div>
          <div className="mt-1">
            Responses from the previous snapshot can be merged with this
            version.
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Has changes - Incompatible
  const { compatibility } = comparison
  if (!compatibility) {
    return null
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        Survey modified - Incompatible with previous snapshot
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2">
          The following changes produce incompatible data:
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {compatibility.incompatibilities.map((issue, index) => (
              <li key={index}>
                {issue.message || formatIncompatibility(issue)}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3">
          Existing responses may be missing data for fields affected by these
          changes. You can still publish, but historical response data for
          changed fields cannot be recovered.
        </div>
        {onIncompatibleConfirmChange !== undefined && (
          <div className="flex items-start gap-2 mt-3">
            <Checkbox
              id="incompatible-confirm-standalone"
              checked={incompatibleConfirmed ?? false}
              onCheckedChange={(checked) =>
                onIncompatibleConfirmChange(checked === true)
              }
              className="mt-0.5"
            />
            <Label
              htmlFor="incompatible-confirm-standalone"
              className="font-normal cursor-pointer leading-snug mb-0"
            >
              I understand that existing response data cannot be recovered for
              the affected fields.
            </Label>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function formatIncompatibility(issue: IncompatibilityDetail): string {
  switch (issue.reason) {
    case 'missing_question':
      return `Question "${issue.itemCode}" was removed`
    case 'incompatible_type':
      return `Question type changed from "${issue.surveyAType}" to "${issue.surveyBType}" for "${issue.itemCode}"`
    case 'missing_answer_option':
      return `Answer option "${issue.itemCode}" was removed`
    case 'missing_subquestion':
      return `Subquestion "${issue.itemCode}" was removed`
    case 'incompatible_required_constraint':
      return `Question "${issue.itemCode}" is now required but was optional in source`
    case 'incompatible_choice_constraint':
      return `Question "${issue.itemCode}" has stricter choice constraints (min/max)`
    case 'incompatible_length_constraint':
      return `Question "${issue.itemCode}" has stricter length constraints (min/max)`
    case 'incompatible_number_constraint':
      return `Question "${issue.itemCode}" has stricter number constraints (min/max or negative values)`
    case 'incompatible_negative_constraint':
      return `Question "${issue.itemCode}" no longer allows negative numbers`
    default:
      return `Incompatibility at ${issue.path}`
  }
}
