import React from 'react'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from 'component/shadcn/accordion'
import { sanitizeHtml } from 'common/sanitizeHtml'

import { formatDateTimeLong } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

interface PublicationInfoSectionProps {
  publication: {
    _id: string
    label?: string | null
    publishedAt?: Date | string | null
    stoppedAt?: Date | string | null
    notes?: string | null
  }
}

export const PublicationInfoSection: React.FC<PublicationInfoSectionProps> = ({
  publication,
}) => {
  const tz = useDisplayTimezone()
  return (
    <AccordionItem value="publication" className="border rounded-lg">
      <AccordionTrigger className="px-6 hover:no-underline">
        <h3 className="text-lg font-semibold">
          Publication{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({tz})
          </span>
        </h3>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Publication ID
            </div>
            <div className="font-mono text-sm">{publication._id}</div>
          </div>
          {publication.label && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Label
              </div>
              <div className="text-base">{publication.label}</div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Published
            </div>
            <div className="text-base">
              {publication.publishedAt
                ? formatDateTimeLong(publication.publishedAt, tz)
                : 'N/A'}
            </div>
          </div>
          {publication.stoppedAt && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Stopped
              </div>
              <div className="text-base">
                {formatDateTimeLong(publication.stoppedAt, tz)}
              </div>
            </div>
          )}
          {publication.notes && (
            <div className="col-span-full">
              <div className="text-sm font-medium text-muted-foreground">
                Notes
              </div>
              <div
                className="text-base html-content"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(publication.notes),
                }}
              />
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
