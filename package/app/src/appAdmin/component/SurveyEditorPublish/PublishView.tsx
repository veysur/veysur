import React from 'react'
import {
  Survey,
  SettingSurvey,
  SurveySnapshotPartial,
  SurveyComparisonResult,
  SurveyPublication,
} from 'veysur-common'
import { Settings, Calendar, Plus, CheckCircle2 } from 'lucide-react'

import { formatDate } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

import {
  BaseAccessSettings,
  BaseScheduleSettings,
  SurveyAdapter,
} from 'appAdmin/component/SurveySettingShared'
import { Separator } from 'component/shadcn/separator'

import { SnapshotDetailsForm } from './SnapshotDetailsForm'
import { CollapsibleCompatibilityStatus } from './CollapsibleCompatibilityStatus'
import { CollapsibleSection } from './CollapsibleSection'
import { AccessSettingsSummary } from './AccessSettingsSummary'
import { ScheduleSettingsSummary } from './ScheduleSettingsSummary'

type Props = {
  survey: Survey
  defaults: SettingSurvey
  handlers: {
    handleBooleanChange: (
      section: string,
      field: string,
      value: string | null,
    ) => void
    handleStringChange: (
      section: string,
      field: string,
      value: string | null,
    ) => void
    YES: string
    NO: string
  }
  // Unified metadata for both publication and snapshot
  label: string
  notes: string
  onLabelChange: (value: string) => void
  onNotesChange: (value: string) => void
  comparison?: SurveyComparisonResult | null
  isLoadingComparison?: boolean
  isComparingWithPublished?: boolean
  hasComparisonSnapshot?: boolean
  isPublished?: boolean
  publication?: SurveyPublication | null
  snapshot?: SurveySnapshotPartial | null
  incompatibleConfirmed?: boolean
  onIncompatibleConfirmChange?: (checked: boolean) => void
}

export const PublishView: React.FC<Props> = ({
  survey,
  defaults,
  handlers,
  label,
  notes,
  onLabelChange,
  onNotesChange,
  comparison,
  isLoadingComparison = false,
  isComparingWithPublished = false,
  hasComparisonSnapshot = false,
  isPublished = false,
  publication = null,
  snapshot = null,
  incompatibleConfirmed,
  onIncompatibleConfirmChange,
}) => {
  const tz = useDisplayTimezone()
  const data = new SurveyAdapter(survey, defaults)

  const hasChanges = comparison?.summary
    ? comparison.summary.totalChanges > 0
    : true
  const isPublishDisabled =
    Boolean(comparison?.isEquivalent === true || (comparison && !hasChanges)) &&
    isComparingWithPublished

  const hasContent = Boolean(label || notes)

  const getSnapshotAccessSummary = (
    snap: SurveySnapshotPartial | null,
  ): string => {
    const access = snap?.surveyPartial?.access
    if (!access) return 'Restricted'
    const labels: string[] = []
    if (access.anonymous) labels.push('Anonymous')
    if (access.open) labels.push('Open')
    if (access.publicReg) labels.push('Registration')
    return labels.length > 0 ? labels.join(' • ') : 'Restricted'
  }

  const getSnapshotScheduleSummary = (
    snap: SurveySnapshotPartial | null,
  ): string => {
    const schedule = snap?.surveyPartial?.schedule
    const start = schedule?.start
      ? formatDate(schedule.start, tz)
      : 'Immediately'
    const end = schedule?.end ? formatDate(schedule.end, tz) : 'Until Stopped'
    return `${start} → ${end}`
  }

  return (
    <div>
      {hasComparisonSnapshot && (
        <CollapsibleCompatibilityStatus
          comparison={comparison || null}
          isLoading={isLoadingComparison}
          isComparingWithPublished={isComparingWithPublished}
          incompatibleConfirmed={incompatibleConfirmed}
          onIncompatibleConfirmChange={onIncompatibleConfirmChange}
        />
      )}

      {isPublished && (publication || snapshot) && (
        <div className="mb-4 relative rounded-md bg-muted/30 border border-border/50 pl-4 pr-3 py-3 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-success rounded-l-md" />
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-success/70 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Currently Published
            </span>
            {publication?.label && (
              <span className="text-sm font-medium ml-1 truncate">
                {publication.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {getSnapshotAccessSummary(snapshot)} ·{' '}
            {getSnapshotScheduleSummary(snapshot)}
          </p>
        </div>
      )}

      {isPublished && (publication || snapshot) && (
        <div className="relative my-5 flex items-center">
          <Separator className="flex-1" />
          <span className="mx-3 text-xs text-muted-foreground uppercase tracking-wide shrink-0">
            New publication
          </span>
          <Separator className="flex-1" />
        </div>
      )}

      <CollapsibleSection
        title="Access Control Settings"
        icon={<Settings className="h-4 w-4" />}
        summary={<AccessSettingsSummary data={data} />}
        defaultExpanded={false}
      >
        <BaseAccessSettings
          data={data}
          handlers={handlers}
          layout={{
            wrapInForm: false,
            wrapInRow: false,
            showCard: false,
          }}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Schedule"
        icon={<Calendar className="h-4 w-4" />}
        summary={<ScheduleSettingsSummary data={data} />}
        defaultExpanded={false}
      >
        <BaseScheduleSettings
          data={data}
          handlers={handlers}
          layout={{
            wrapInForm: false,
            wrapInRow: false,
            showCard: false,
          }}
        />
      </CollapsibleSection>

      {!isPublishDisabled && (
        <CollapsibleSection
          title={hasContent ? 'Label & Notes' : 'Label & Notes (Optional)'}
          icon={<Plus className="h-4 w-4" />}
          defaultExpanded={hasContent}
          className="mb-4"
        >
          <SnapshotDetailsForm
            label={label}
            notes={notes}
            onLabelChange={onLabelChange}
            onNotesChange={onNotesChange}
            labelPlaceholder="e.g., Beta Launch - Q1 2024"
            notesPlaceholder="e.g., Rolled out to beta users for testing..."
          />
        </CollapsibleSection>
      )}
    </div>
  )
}
