import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { SurveyComparisonResult } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'
import { Label } from 'component/shadcn/label'
import { cn } from 'common/cn'

import {
  CompatibilityStatus,
  formatIncompatibility,
} from './CompatibilityStatus'

type Props = {
  comparison: SurveyComparisonResult | null
  isLoading: boolean
  isComparingWithPublished: boolean
  defaultExpanded?: boolean
  incompatibleConfirmed?: boolean
  onIncompatibleConfirmChange?: (checked: boolean) => void
}

export const CollapsibleCompatibilityStatus: React.FC<Props> = ({
  comparison,
  isLoading,
  isComparingWithPublished,
  defaultExpanded,
  incompatibleConfirmed,
  onIncompatibleConfirmChange,
}) => {
  // Determine if should be expanded by default
  const shouldDefaultExpand = () => {
    if (defaultExpanded !== undefined) return defaultExpanded
    // Auto-expand incompatible changes
    if (comparison && !comparison.isCompatible) return true
    return false
  }

  const [isExpanded, setIsExpanded] = useState(shouldDefaultExpand())

  // Show loading and null states directly from CompatibilityStatus
  if (isLoading || !comparison) {
    return (
      <CompatibilityStatus
        comparison={comparison}
        isLoading={isLoading}
        isComparingWithPublished={isComparingWithPublished}
        incompatibleConfirmed={incompatibleConfirmed}
        onIncompatibleConfirmChange={onIncompatibleConfirmChange}
      />
    )
  }

  // Check if there are actually any changes
  const hasChanges = comparison.summary
    ? comparison.summary.totalChanges > 0
    : true

  // Determine summary info for collapsed view
  const getSummaryInfo = () => {
    if (comparison.isEquivalent || !hasChanges) {
      if (isComparingWithPublished) {
        return {
          icon: (
            <CheckCircle className="h-4 w-4 text-[var(--alert-success-icon)]" />
          ),
          text: 'No changes detected',
          variant: 'default' as const,
        }
      } else {
        return {
          icon: <Info className="h-4 w-4 text-[var(--alert-info-icon)]" />,
          text: 'No changes since last snapshot',
          variant: 'default' as const,
        }
      }
    }

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

      const summaryText = hasStructuralChanges
        ? `${summary.addedItems} added, ${summary.modifiedItems} modified, ${summary.removedItems} removed`
        : fieldChangesCount > 0
          ? `${fieldChangesCount} setting${fieldChangesCount !== 1 ? 's' : ''} changed`
          : `${summary.totalChanges} change${summary.totalChanges !== 1 ? 's' : ''}`

      return {
        icon: <Info className="h-4 w-4 text-[var(--alert-info-icon)]" />,
        text: `${summaryText} - Compatible`,
        variant: 'default' as const,
      }
    }

    // Incompatible
    return {
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      text: 'Incompatible changes detected',
      variant: 'destructive' as const,
    }
  }

  const summaryInfo = getSummaryInfo()

  // Collapsed view
  if (!isExpanded) {
    return (
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'w-full justify-between px-3 py-2 h-auto hover:bg-muted/40 text-left',
            summaryInfo.variant === 'destructive' &&
              'border-2 text-[var(--alert-error-fg)] border-destructive/50',
          )}
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-2">
            {summaryInfo.icon}
            <span
              className={cn(
                'font-medium',
                summaryInfo.variant === 'destructive' && 'text-destructive',
              )}
            >
              {summaryInfo.text}
            </span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Expanded view — incompatible: single unified red panel
  if (!comparison.isCompatible && comparison.compatibility) {
    return (
      <div className="mb-4 rounded-lg border border-[var(--alert-error-border)] bg-[var(--alert-error-bg)] overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 border-b border-[var(--alert-error-border)] bg-black/5 hover:bg-muted/40 dark:bg-white/5 dark:hover:bg-white/10 text-left"
          onClick={() => setIsExpanded(false)}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--alert-error-icon)] shrink-0" />
            <span className="font-medium text-sm text-[var(--alert-error-fg)]">
              Incompatible changes detected
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-[var(--alert-error-icon)] shrink-0" />
        </button>

        <div className="px-4 py-3 text-sm text-[var(--alert-error-fg)] space-y-3">
          <div>
            The following changes produce incompatible data:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {comparison.compatibility.incompatibilities.map(
                (issue, index) => (
                  <li key={index}>
                    {issue.message || formatIncompatibility(issue)}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="border-l-2 border-[var(--alert-error-border)] pl-3">
            Existing responses may be missing data for fields affected by these
            changes. You can still publish, but historical response data for
            changed fields cannot be recovered.
          </div>

          {onIncompatibleConfirmChange !== undefined && (
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="incompatible-confirm"
                checked={incompatibleConfirmed ?? false}
                onCheckedChange={(checked) =>
                  onIncompatibleConfirmChange(checked === true)
                }
                className="mt-0.5 border-destructive/60 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
              />
              <Label
                htmlFor="incompatible-confirm"
                className="font-normal cursor-pointer leading-snug mb-0 text-[var(--alert-error-fg)]"
              >
                I understand that existing response data cannot be recovered for
                the affected fields.
              </Label>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Expanded view — compatible / no-changes: header button + status alert
  return (
    <div className="mb-4">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50 mb-2"
        onClick={() => setIsExpanded(false)}
      >
        <div className="flex items-center gap-2">
          {summaryInfo.icon}
          <span className="font-medium">{summaryInfo.text}</span>
        </div>
        <ChevronDown className="h-4 w-4" />
      </Button>
      <CompatibilityStatus
        comparison={comparison}
        isLoading={false}
        isComparingWithPublished={isComparingWithPublished}
        incompatibleConfirmed={incompatibleConfirmed}
        onIncompatibleConfirmChange={onIncompatibleConfirmChange}
      />
    </div>
  )
}
