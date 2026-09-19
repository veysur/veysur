import React from 'react'
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Copy,
  ShieldCheck,
  UserX,
  LucideIcon,
} from 'lucide-react'
import { MergeStatistics as MergeStatisticsType } from 'veysur-common'

import { cn } from '@/common/cn'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Progress } from 'component/shadcn/progress'

type Props = {
  stats: MergeStatisticsType
}

type StatItemProps = {
  icon: LucideIcon
  label: string
  description: string
  value: number
  valueClassName?: string
}

const StatItem: React.FC<StatItemProps> = ({
  icon: Icon,
  label,
  description,
  value,
  valueClassName,
}) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
    <div className={cn('text-2xl font-bold shrink-0', valueClassName)}>
      {value}
    </div>
  </div>
)

export const MergeStatistics: React.FC<Props> = ({ stats }) => {
  const totalAnswers = stats.answersTransferred + stats.answersSkipped
  const transferRate =
    totalAnswers > 0
      ? Math.round((stats.answersTransferred / totalAnswers) * 100)
      : 0
  const transferRateColor =
    transferRate >= 80
      ? 'text-green-600'
      : transferRate >= 50
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <div className="space-y-4">
      {/* Transfer Rate - headline metric */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Success Rate</CardTitle>
          <CardDescription>
            Percentage of answers successfully transferred
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3 mb-3">
            <span className={cn('text-4xl font-bold', transferRateColor)}>
              {transferRate}%
            </span>
            {totalAnswers > 0 && (
              <span className="text-sm text-muted-foreground">
                {stats.answersTransferred} of {totalAnswers} answers
              </span>
            )}
          </div>
          <Progress value={transferRate} />
        </CardContent>
      </Card>

      {/* Statistics Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatItem
          icon={FileText}
          label="Source Responses"
          description="Responses available in source"
          value={stats.sourceResponseCount}
        />

        <StatItem
          icon={Copy}
          label="New Responses Created"
          description="New responses to be copied to target"
          value={stats.responsesCreated}
          valueClassName="text-green-600"
        />

        {stats.responsesAlreadyMerged > 0 && (
          <StatItem
            icon={ShieldCheck}
            label="Already Merged"
            description="Responses already merged (skipped)"
            value={stats.responsesAlreadyMerged}
            valueClassName="text-blue-600"
          />
        )}

        {stats.responsesSkippedParticipantDuplicate > 0 && (
          <StatItem
            icon={UserX}
            label="Duplicate Participant"
            description="Skipped, participant already has a response in target"
            value={stats.responsesSkippedParticipantDuplicate}
            valueClassName="text-blue-600"
          />
        )}

        <StatItem
          icon={CheckCircle}
          label="Answers Transferred"
          description="Individual answers successfully copied"
          value={stats.answersTransferred}
          valueClassName="text-green-600"
        />

        <StatItem
          icon={AlertCircle}
          label="Answers Skipped"
          description="Answers not copied due to incompatibility"
          value={stats.answersSkipped}
          valueClassName="text-amber-600"
        />
      </div>

      {/* Skip Reasons Breakdown */}
      {stats.answersSkipped > 0 &&
        Object.keys(stats.answerSkipReasons).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">
                Answers were skipped for the following reasons:
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {Object.entries(stats.answerSkipReasons).map(
                  ([reason, count]) => (
                    <li key={reason}>
                      {formatSkipReason(reason)}: {count} answer
                      {count !== 1 ? 's' : ''}
                    </li>
                  ),
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
    </div>
  )
}

function formatSkipReason(reason: string): string {
  switch (reason) {
    case 'missing_question':
      return 'Question not found in target'
    case 'incompatible_type':
      return 'Question type incompatible'
    case 'missing_option':
      return 'Answer option not found in target'
    case 'missing_subquestion':
      return 'Subquestion not found in target'
    default:
      return reason
  }
}
