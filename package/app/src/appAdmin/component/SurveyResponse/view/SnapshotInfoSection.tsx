import React from 'react'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from 'component/shadcn/accordion'
import { sanitizeHtml } from 'common/sanitizeHtml'

import { formatDateTimeLong } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

interface SnapshotInfoSectionProps {
  snapshot: {
    _id: string
    label?: string | null
    createdAt: Date | string
    contentHash: string
    notes?: string | null
  }
}

export const SnapshotInfoSection: React.FC<SnapshotInfoSectionProps> = ({
  snapshot,
}) => {
  const tz = useDisplayTimezone()
  return (
    <AccordionItem value="snapshot" className="border rounded-lg">
      <AccordionTrigger className="px-6 hover:no-underline">
        <h3 className="text-lg font-semibold">
          Snapshot{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({tz})
          </span>
        </h3>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Snapshot ID
            </div>
            <div className="font-mono text-sm">{snapshot._id}</div>
          </div>
          {snapshot.label && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Label
              </div>
              <div className="text-base">{snapshot.label}</div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Created
            </div>
            <div className="text-base">
              {formatDateTimeLong(snapshot.createdAt, tz)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Content Hash
            </div>
            <div className="font-mono text-sm break-all">
              {snapshot.contentHash}
            </div>
          </div>
          {snapshot.notes && (
            <div className="col-span-full">
              <div className="text-sm font-medium text-muted-foreground">
                Notes
              </div>
              <div
                className="text-base html-content"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(snapshot.notes),
                }}
              />
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
