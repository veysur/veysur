import React from 'react'
import { Info } from 'lucide-react'

import { isAnonymisedTimestamp } from 'veysur-common'

import { formatDateTimeLong } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from 'component/shadcn/accordion'
import { Alert, AlertDescription } from 'component/shadcn/alert'

interface ResponseDetailsSectionProps {
  response: {
    _id: string
    createdAt: Date | string
    updatedAt: Date | string
    completed?: boolean
    completedAt?: Date | string | null
    ip?: string | null
    referrerUrl?: string | null
    merge?: {
      fromSnapshotId: string | null
      at: Date | string | null
    } | null
  }
  /**
   * The survey this response belongs to is anonymous — its timestamps carry a
   * placeholder value and must be shown as "Anonymised", never as a real time.
   */
  anonymous?: boolean
}

const ANONYMISED_LABEL = 'Anonymised'

export const ResponseDetailsSection: React.FC<ResponseDetailsSectionProps> = ({
  response,
  anonymous = false,
}) => {
  const tz = useDisplayTimezone()

  const showTimestamp = (value: Date | string | null | undefined) =>
    anonymous || isAnonymisedTimestamp(value)
      ? ANONYMISED_LABEL
      : formatDateTimeLong(value, tz)

  return (
    <AccordionItem value="response" className="border rounded-lg">
      <AccordionTrigger className="px-6 hover:no-underline">
        <h3 className="text-lg font-semibold">
          Response Details{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({tz})
          </span>
        </h3>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Response ID
            </div>
            <div className="font-mono text-sm">{response._id}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Created
            </div>
            <div className="text-base">{showTimestamp(response.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Last Updated
            </div>
            <div className="text-base">{showTimestamp(response.updatedAt)}</div>
          </div>
          {response.completed && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Completed
              </div>
              <div className="text-base">
                {anonymous
                  ? ANONYMISED_LABEL
                  : response.completedAt
                    ? showTimestamp(response.completedAt)
                    : 'Yes'}
              </div>
            </div>
          )}
          {response.ip && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                IP Address
              </div>
              <div className="font-mono text-sm">{response.ip}</div>
            </div>
          )}
          {response.referrerUrl && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Referrer URL
              </div>
              <div className="text-base break-all">{response.referrerUrl}</div>
            </div>
          )}
        </div>
        {response.merge?.fromSnapshotId && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Merged Response:</strong> This response was merged from
              snapshot{' '}
              <code className="font-mono text-sm bg-muted px-1 py-0.5 rounded">
                {response.merge.fromSnapshotId}
              </code>{' '}
              on {formatDateTimeLong(response.merge.at, tz)}
            </AlertDescription>
          </Alert>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
